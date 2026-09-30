<?php
declare(strict_types=1);

namespace App;

use PDO;

/** Exception yang otomatis diubah menjadi respons JSON. */
final class ApiException extends \RuntimeException
{
    public array $errors;

    public function __construct(int $status, string $message, array $errors = [])
    {
        parent::__construct($message, $status);
        $this->errors = $errors;
    }
}

final class Config
{
    private static ?array $data = null;

    public static function load(array $data): void
    {
        self::$data = $data;
    }

    public static function get(string $path, mixed $default = null): mixed
    {
        $node = self::$data;
        foreach (explode('.', $path) as $key) {
            if (!is_array($node) || !array_key_exists($key, $node)) {
                return $default;
            }
            $node = $node[$key];
        }
        return $node;
    }
}

final class Db
{
    private static ?PDO $pdo = null;

    public static function pdo(): PDO
    {
        if (self::$pdo === null) {
            $c = Config::get('db');
            $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $c['host'], $c['port'], $c['name'], $c['charset']);
            self::$pdo = new PDO($dsn, $c['user'], $c['pass'], [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
            self::$pdo->exec("SET time_zone = '" . date('P') . "'");
        }
        return self::$pdo;
    }

    /** @return array<int,array<string,mixed>> */
    public static function all(string $sql, array $params = []): array
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($params);
        return $st->fetchAll();
    }

    public static function one(string $sql, array $params = []): ?array
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($params);
        $row = $st->fetch();
        return $row === false ? null : $row;
    }

    public static function value(string $sql, array $params = []): mixed
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($params);
        $v = $st->fetchColumn();
        return $v === false ? null : $v;
    }

    public static function exec(string $sql, array $params = []): int
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($params);
        return $st->rowCount();
    }

    public static function insert(string $sql, array $params = []): int
    {
        self::exec($sql, $params);
        return (int) self::pdo()->lastInsertId();
    }

    public static function transaction(callable $fn): mixed
    {
        $pdo = self::pdo();
        $pdo->beginTransaction();
        try {
            $result = $fn();
            $pdo->commit();
            return $result;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }
}

final class Request
{
    public string $method;
    public string $path;
    public array $query;
    private ?array $body = null;

    public static function capture(): self
    {
        $r = new self();
        $r->method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $r->query  = $_GET;

        $uri  = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
        $uri  = rawurldecode($uri);
        $base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
        if ($base !== '' && str_starts_with($uri, $base)) {
            $uri = substr($uri, strlen($base));
        }
        if (str_starts_with($uri, '/index.php')) {
            $uri = substr($uri, strlen('/index.php'));
        }
        $r->path = '/' . trim($uri, '/');
        return $r;
    }

    public function header(string $name): ?string
    {
        $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        if (isset($_SERVER[$key])) {
            return (string) $_SERVER[$key];
        }
        if ($name === 'Authorization' && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            return (string) $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }
        if (function_exists('getallheaders')) {
            foreach (getallheaders() as $k => $v) {
                if (strcasecmp($k, $name) === 0) {
                    return (string) $v;
                }
            }
        }
        return null;
    }

    public function bearer(): ?string
    {
        $h = $this->header('Authorization');
        if ($h !== null && preg_match('/^Bearer\s+(.+)$/i', $h, $m)) {
            return trim($m[1]);
        }
        return null;
    }

    /** Body request: JSON (application/json) atau form-data / urlencoded. */
    public function input(): array
    {
        if ($this->body !== null) {
            return $this->body;
        }
        $type = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
        if (str_contains($type, 'application/json')) {
            $raw  = file_get_contents('php://input') ?: '';
            $data = json_decode($raw, true);
            if ($raw !== '' && !is_array($data)) {
                throw new ApiException(400, 'Body JSON tidak valid.');
            }
            $this->body = is_array($data) ? $data : [];
        } else {
            $this->body = $_POST;
        }
        return $this->body;
    }

    public function file(string $key): ?array
    {
        if (!isset($_FILES[$key]) || !is_array($_FILES[$key])) {
            return null;
        }
        if (($_FILES[$key]['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            return null;
        }
        return $_FILES[$key];
    }
}

final class Response
{
    public static function json(mixed $data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['data' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR);
        exit;
    }

    public static function error(int $status, string $message, array $errors = []): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        $payload = ['error' => ['message' => $message]];
        if ($errors) {
            $payload['error']['errors'] = $errors;
        }
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR);
        exit;
    }

    /** Kirim file (download) dari folder uploads. */
    public static function file(string $absPath, string $downloadName): never
    {
        if (!is_file($absPath)) {
            throw new ApiException(404, 'File tidak ditemukan di server.');
        }
        $ext  = strtolower(pathinfo($absPath, PATHINFO_EXTENSION));
        $mime = [
            'pdf' => 'application/pdf', 'txt' => 'text/plain', 'zip' => 'application/zip',
            'png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg',
            'mp4' => 'video/mp4', 'webm' => 'video/webm',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls' => 'application/vnd.ms-excel',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt' => 'application/vnd.ms-powerpoint',
            'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ][$ext] ?? 'application/octet-stream';

        $safe = str_replace(['"', "\r", "\n", '\\'], '_', $downloadName);
        http_response_code(200);
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . filesize($absPath));
        header("Content-Disposition: attachment; filename=\"" . $safe . "\"; filename*=UTF-8''" . rawurlencode($downloadName));
        header('X-Content-Type-Options: nosniff');
        readfile($absPath);
        exit;
    }
}

/** Helper validasi input sederhana. */
final class Input
{
    /** @param array<string,string> $errors */
    public static function str(array $d, string $key, string $label, array &$errors, bool $required = true, int $max = 255): ?string
    {
        $v = isset($d[$key]) && !is_array($d[$key]) ? trim((string) $d[$key]) : '';
        if ($v === '') {
            if ($required) {
                $errors[$key] = "$label wajib diisi.";
            }
            return null;
        }
        if (mb_strlen($v) > $max) {
            $errors[$key] = "$label maksimal $max karakter.";
            return null;
        }
        return $v;
    }

    public static function email(array $d, array &$errors, string $key = 'email'): ?string
    {
        $v = self::str($d, $key, 'Email', $errors, true, 190);
        if ($v !== null && !filter_var($v, FILTER_VALIDATE_EMAIL)) {
            $errors[$key] = 'Format email tidak valid.';
            return null;
        }
        return $v === null ? null : strtolower($v);
    }

    public static function password(array $d, array &$errors, bool $required, string $key = 'password'): ?string
    {
        $v = isset($d[$key]) && !is_array($d[$key]) ? (string) $d[$key] : '';
        if ($v === '') {
            if ($required) {
                $errors[$key] = 'Password wajib diisi.';
            }
            return null;
        }
        if (strlen($v) < 6) {
            $errors[$key] = 'Password minimal 6 karakter.';
            return null;
        }
        return $v;
    }

    public static function int(array $d, string $key, string $label, array &$errors, bool $required = true, int $min = 0, int $max = PHP_INT_MAX): ?int
    {
        $raw = $d[$key] ?? null;
        if ($raw === null || $raw === '') {
            if ($required) {
                $errors[$key] = "$label wajib diisi.";
            }
            return null;
        }
        if (!is_numeric($raw) || (float) $raw != (int) $raw) {
            $errors[$key] = "$label harus berupa angka bulat.";
            return null;
        }
        $n = (int) $raw;
        if ($n < $min || $n > $max) {
            $errors[$key] = "$label harus antara $min dan $max.";
            return null;
        }
        return $n;
    }

    public static function date(array $d, string $key, string $label, array &$errors, bool $required = true): ?string
    {
        $v = self::str($d, $key, $label, $errors, $required, 10);
        if ($v === null) {
            return null;
        }
        $dt = \DateTime::createFromFormat('Y-m-d', $v);
        if (!$dt || $dt->format('Y-m-d') !== $v) {
            $errors[$key] = "$label harus berformat YYYY-MM-DD.";
            return null;
        }
        return $v;
    }

    public static function enum(array $d, string $key, string $label, array $allowed, array &$errors, bool $required = true): ?string
    {
        $v = self::str($d, $key, $label, $errors, $required, 100);
        if ($v === null) {
            return null;
        }
        if (!in_array($v, $allowed, true)) {
            $errors[$key] = "$label tidak valid.";
            return null;
        }
        return $v;
    }

    public static function url(array $d, string $key, string $label, array &$errors): ?string
    {
        $v = self::str($d, $key, $label, $errors, false, 500);
        if ($v === null) {
            return null;
        }
        $scheme = strtolower((string) parse_url($v, PHP_URL_SCHEME));
        if (!filter_var($v, FILTER_VALIDATE_URL) || !in_array($scheme, ['http', 'https'], true)) {
            $errors[$key] = "$label harus berupa URL http/https yang valid.";
            return null;
        }
        return $v;
    }

    public static function assertValid(array $errors): void
    {
        if ($errors) {
            throw new ApiException(422, 'Data yang dikirim belum valid.', $errors);
        }
    }
}

/** Penyimpanan file upload (di luar akses langsung web, lihat uploads/.htaccess). */
final class Upload
{
    public const ALLOWED = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'png', 'jpg', 'jpeg', 'mp4', 'webm'];

    public static function root(): string
    {
        return dirname(__DIR__) . '/uploads';
    }

    /** @return array{name:string,path:string,size:int} */
    public static function save(array $file, string $subdir): array
    {
        $err = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($err === UPLOAD_ERR_INI_SIZE || $err === UPLOAD_ERR_FORM_SIZE) {
            throw new ApiException(422, 'Ukuran file melebihi batas server (cek upload_max_filesize & post_max_size di php.ini).');
        }
        if ($err !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
            throw new ApiException(422, 'Upload file gagal. Coba lagi.');
        }
        $maxBytes = (int) Config::get('app.max_upload_mb', 25) * 1024 * 1024;
        if ((int) $file['size'] > $maxBytes) {
            throw new ApiException(422, 'Ukuran file maksimal ' . Config::get('app.max_upload_mb', 25) . ' MB.');
        }
        $original = basename((string) $file['name']);
        $ext = strtolower(pathinfo($original, PATHINFO_EXTENSION));
        if (!in_array($ext, self::ALLOWED, true)) {
            throw new ApiException(422, 'Tipe file .' . $ext . ' tidak diizinkan. Diizinkan: ' . implode(', ', self::ALLOWED) . '.');
        }
        $dir = self::root() . '/' . $subdir;
        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new ApiException(500, 'Folder upload tidak dapat dibuat.');
        }
        $stored = bin2hex(random_bytes(16)) . '.' . $ext;
        if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $stored)) {
            throw new ApiException(500, 'File tidak dapat disimpan.');
        }
        return ['name' => mb_substr($original, 0, 255), 'path' => $subdir . '/' . $stored, 'size' => (int) $file['size']];
    }

    public static function absolute(string $relative): string
    {
        // Cegah path traversal: hanya nama file biasa di dalam uploads/
        $relative = str_replace('\\', '/', $relative);
        if (str_contains($relative, '..')) {
            throw new ApiException(400, 'Path file tidak valid.');
        }
        return self::root() . '/' . ltrim($relative, '/');
    }

    public static function delete(?string $relative): void
    {
        if ($relative === null || $relative === '') {
            return;
        }
        $abs = self::absolute($relative);
        if (is_file($abs)) {
            @unlink($abs);
        }
    }
}

final class Num
{
    public static function f(mixed $v, int $dec = 1): ?float
    {
        return $v === null ? null : round((float) $v, $dec);
    }
}
