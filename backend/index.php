<?php
declare(strict_types=1);

/**
 * Lumora E-Learning - REST API (PHP 8.1+ / MySQL) untuk Laragon.
 * Semua request masuk lewat file ini (lihat .htaccess).
 */

use App\ApiException;
use App\Config;
use App\Request;
use App\Response;
use App\Router;
use App\Controllers\{AdminController, AuthController, FileController, GuruController, MonitorController, PeopleController, SiswaController};

if (PHP_VERSION_ID < 80100) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => ['message' => 'Backend membutuhkan PHP 8.1 atau lebih baru. Versi sekarang: ' . PHP_VERSION]]);
    exit;
}

require __DIR__ . '/src/Support.php';
spl_autoload_register(static function (string $class): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $file = __DIR__ . '/src/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
    if (is_file($file)) {
        require $file;
    }
});

Config::load(require __DIR__ . '/config.php');
date_default_timezone_set((string) Config::get('app.timezone', 'Asia/Jakarta'));
ini_set('display_errors', '0');
error_reporting(E_ALL);

// ---------------------------------------------------------------- CORS
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, (array) Config::get('app.cors_origins', []), true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Authorization, Content-Type, Accept');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Expose-Headers: Content-Disposition');
    header('Access-Control-Max-Age: 600');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ---------------------------------------------------------------- error handling
set_exception_handler(static function (\Throwable $e): void {
    if ($e instanceof ApiException) {
        Response::error($e->getCode(), $e->getMessage(), $e->errors);
    }
    error_log('[lumora] ' . get_class($e) . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    $debug = (bool) Config::get('app.debug', false);
    $msg = 'Terjadi kesalahan pada server.';
    if ($e instanceof \PDOException) {
        $msg = 'Database tidak dapat diakses. Pastikan MySQL di Laragon sudah berjalan dan database sudah diimpor.';
    }
    Response::error(500, $debug ? $msg . ' [' . $e->getMessage() . ']' : $msg);
});

// ---------------------------------------------------------------- routes
$r = new Router();
$A = new AuthController();
$P = new PeopleController();
$AD = new AdminController();
$G = new GuruController();
$S = new SiswaController();
$M = new MonitorController();
$F = new FileController();

$r->add('GET', '/api', static fn() => ['name' => 'Lumora E-Learning API', 'status' => 'ok', 'time' => date('c')], []);
$r->add('GET', '/', static fn() => ['name' => 'Lumora E-Learning API', 'status' => 'ok', 'hint' => 'Endpoint ada di /api/...'], []);

// Auth & referensi
$r->add('POST', '/api/auth/login', [$A, 'login'], []);
$r->add('GET',  '/api/auth/me',    [$A, 'me']);
$r->add('GET',  '/api/meta',       [$P, 'meta']);

// Data bersama
$r->add('GET', '/api/students', [$P, 'students'], ['admin', 'guru', 'kurikulum', 'kepsek']);
$r->add('GET', '/api/teachers', [$P, 'teachers'], ['admin', 'kurikulum', 'kepsek']);
$r->add('GET', '/api/classes',  [$P, 'classes'],  ['admin', 'kurikulum', 'kepsek']);

// Admin
$adm = ['admin'];
$r->add('GET',    '/api/admin/stats',               [$AD, 'stats'],         $adm);
$r->add('GET',    '/api/admin/accounts',            [$AD, 'accounts'],      $adm);
$r->add('POST',   '/api/admin/accounts',            [$AD, 'accountCreate'], $adm);
$r->add('PUT',    '/api/admin/accounts/{id}',       [$AD, 'accountUpdate'], $adm);
$r->add('DELETE', '/api/admin/accounts/{id}',       [$AD, 'accountDelete'], $adm);
$r->add('POST',   '/api/admin/classes',             [$AD, 'classCreate'],   $adm);
$r->add('PUT',    '/api/admin/classes/{id}',        [$AD, 'classUpdate'],   $adm);
$r->add('DELETE', '/api/admin/classes/{id}',        [$AD, 'classDelete'],   $adm);
$r->add('POST',   '/api/admin/teachers',            [$AD, 'teacherCreate'], $adm);
$r->add('PUT',    '/api/admin/teachers/{id}',       [$AD, 'teacherUpdate'], $adm);
$r->add('DELETE', '/api/admin/teachers/{id}',       [$AD, 'teacherDelete'], $adm);
$r->add('POST',   '/api/admin/students',            [$AD, 'studentCreate'], $adm);
$r->add('PUT',    '/api/admin/students/{id}',       [$AD, 'studentUpdate'], $adm);
$r->add('DELETE', '/api/admin/students/{id}',       [$AD, 'studentDelete'], $adm);

// Guru
$gr = ['guru'];
$r->add('GET',    '/api/guru/dashboard',                     [$G, 'dashboard'],        $gr);
$r->add('GET',    '/api/guru/materials',                     [$G, 'materials'],        $gr);
$r->add('POST',   '/api/guru/materials',                     [$G, 'materialSave'],     $gr);
$r->add('POST',   '/api/guru/materials/{id}',                [$G, 'materialSave'],     $gr); // ubah (multipart)
$r->add('PUT',    '/api/guru/materials/{id}',                [$G, 'materialSave'],     $gr);
$r->add('DELETE', '/api/guru/materials/{id}',                [$G, 'materialDelete'],   $gr);
$r->add('GET',    '/api/guru/assessments',                   [$G, 'assessments'],      $gr);
$r->add('POST',   '/api/guru/assessments',                   [$G, 'assessmentSave'],   $gr);
$r->add('PUT',    '/api/guru/assessments/{id}',              [$G, 'assessmentSave'],   $gr);
$r->add('DELETE', '/api/guru/assessments/{id}',              [$G, 'assessmentDelete'], $gr);
$r->add('GET',    '/api/guru/assessments/{id}/questions',    [$G, 'questions'],        $gr);
$r->add('POST',   '/api/guru/assessments/{id}/questions',    [$G, 'questionCreate'],   $gr);
$r->add('GET',    '/api/guru/assessments/{id}/results',      [$G, 'assessmentResults'], $gr);
$r->add('PUT',    '/api/guru/questions/{id}',                [$G, 'questionUpdate'],   $gr);
$r->add('DELETE', '/api/guru/questions/{id}',                [$G, 'questionDelete'],   $gr);
$r->add('GET',    '/api/guru/assignments',                   [$G, 'assignments'],      $gr);
$r->add('POST',   '/api/guru/assignments',                   [$G, 'assignmentSave'],   $gr);
$r->add('PUT',    '/api/guru/assignments/{id}',              [$G, 'assignmentSave'],   $gr);
$r->add('DELETE', '/api/guru/assignments/{id}',              [$G, 'assignmentDelete'], $gr);
$r->add('GET',    '/api/guru/assignments/{id}/submissions',  [$G, 'submissions'],      $gr);
$r->add('PUT',    '/api/guru/submissions/{id}/grade',        [$G, 'submissionGrade'],  $gr);
$r->add('GET',    '/api/guru/grades',                        [$G, 'grades'],           $gr);

// Siswa
$sw = ['siswa'];
$r->add('GET',  '/api/siswa/dashboard',              [$S, 'dashboard'],        $sw);
$r->add('GET',  '/api/siswa/materials',              [$S, 'materials'],        $sw);
$r->add('GET',  '/api/siswa/assignments',            [$S, 'assignments'],      $sw);
$r->add('POST', '/api/siswa/assignments/{id}/submit', [$S, 'assignmentSubmit'], $sw);
$r->add('GET',  '/api/siswa/exams',                  [$S, 'exams'],            $sw);
$r->add('POST', '/api/siswa/exams/{id}/start',       [$S, 'examStart'],        $sw);
$r->add('POST', '/api/siswa/exams/{id}/submit',      [$S, 'examSubmit'],       $sw);

// Monitoring (Kurikulum & Kepala Sekolah)
$mon = ['kurikulum', 'kepsek', 'admin'];
$r->add('GET', '/api/monitor/summary',     [$M, 'summary'],     $mon);
$r->add('GET', '/api/monitor/grades',      [$M, 'grades'],      $mon);
$r->add('GET', '/api/monitor/assignments', [$M, 'assignments'], $mon);
$r->add('GET', '/api/monitor/assessments', [$M, 'assessments'], $mon);

// Unduh file
$r->add('GET', '/api/materials/{id}/download',   [$F, 'material']);
$r->add('GET', '/api/submissions/{id}/download', [$F, 'submission'], ['admin', 'guru', 'siswa']);

$r->dispatch(Request::capture());
