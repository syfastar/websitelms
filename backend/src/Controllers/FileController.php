<?php
declare(strict_types=1);

namespace App\Controllers;

use App\ApiException;
use App\Db;
use App\Request;
use App\Response;
use App\Upload;

final class FileController
{
    public function material(Request $req, array $p, array $user): never
    {
        $m = Db::one('SELECT id, teacher_id, class_id, file_path, file_name FROM materials WHERE id = ?', [(int) $p['id']]);
        if (!$m) {
            throw new ApiException(404, 'Materi tidak ditemukan.');
        }
        if ($user['role'] === 'guru') {
            $t = Db::one('SELECT id FROM teachers WHERE user_id = ?', [(int) $user['id']]);
            if (!$t || (int) $t['id'] !== (int) $m['teacher_id']) {
                throw new ApiException(403, 'Anda tidak memiliki akses ke materi ini.');
            }
        } elseif ($user['role'] === 'siswa') {
            $s = Db::one('SELECT class_id FROM students WHERE user_id = ?', [(int) $user['id']]);
            if (!$s || (int) $s['class_id'] !== (int) $m['class_id']) {
                throw new ApiException(403, 'Materi ini bukan untuk kelas Anda.');
            }
        }
        if ($m['file_path'] === null) {
            throw new ApiException(404, 'Materi ini berupa link, bukan file.');
        }
        Response::file(Upload::absolute($m['file_path']), $m['file_name'] ?: basename($m['file_path']));
    }

    public function submission(Request $req, array $p, array $user): never
    {
        $s = Db::one(
            'SELECT s.file_path, s.file_name, s.student_id, a.teacher_id
             FROM submissions s JOIN assignments a ON a.id = s.assignment_id WHERE s.id = ?',
            [(int) $p['id']]
        );
        if (!$s) {
            throw new ApiException(404, 'Pengumpulan tidak ditemukan.');
        }
        if ($user['role'] === 'guru') {
            $t = Db::one('SELECT id FROM teachers WHERE user_id = ?', [(int) $user['id']]);
            if (!$t || (int) $t['id'] !== (int) $s['teacher_id']) {
                throw new ApiException(403, 'Anda tidak memiliki akses ke file ini.');
            }
        } elseif ($user['role'] === 'siswa') {
            $st = Db::one('SELECT id FROM students WHERE user_id = ?', [(int) $user['id']]);
            if (!$st || (int) $st['id'] !== (int) $s['student_id']) {
                throw new ApiException(403, 'Anda tidak memiliki akses ke file ini.');
            }
        }
        if ($s['file_path'] === null) {
            throw new ApiException(404, 'Pengumpulan ini tidak memiliki file.');
        }
        Response::file(Upload::absolute($s['file_path']), $s['file_name'] ?: basename($s['file_path']));
    }
}
