<?php
declare(strict_types=1);

namespace App\Controllers;

use App\ApiException;
use App\Db;
use App\Input;
use App\Request;

final class AdminController
{
    private const ROLES = ['admin', 'guru', 'siswa', 'kurikulum', 'kepsek'];

    // ------------------------------------------------------------ statistik
    public function stats(): array
    {
        return [
            'students' => (int) Db::value('SELECT COUNT(*) FROM students'),
            'teachers' => (int) Db::value('SELECT COUNT(*) FROM teachers'),
            'classes'  => (int) Db::value('SELECT COUNT(*) FROM classes'),
            'subjects' => (int) Db::value('SELECT COUNT(*) FROM subjects'),
            'active_classes' => (int) Db::value('SELECT COUNT(DISTINCT class_id) FROM students WHERE class_id IS NOT NULL'),
            'academic_year'  => Db::value('SELECT academic_year FROM classes ORDER BY academic_year DESC LIMIT 1'),
        ];
    }

    // ------------------------------------------------------------ akun
    public function accounts(): array
    {
        return array_map(static fn(array $u): array => [
            'id'         => (int) $u['id'],
            'name'       => $u['name'],
            'email'      => $u['email'],
            'role'       => $u['role'],
            'status'     => $u['status'],
            'last_login' => $u['last_login'],
        ], Db::all('SELECT id, name, email, role, status, last_login FROM users ORDER BY FIELD(role,\'admin\',\'kepsek\',\'kurikulum\',\'guru\',\'siswa\'), name'));
    }

    public function accountCreate(Request $req): array
    {
        $d = $req->input();
        $e = [];
        $name = Input::str($d, 'name', 'Nama', $e, true, 150);
        $email = Input::email($d, $e);
        $role = Input::enum($d, 'role', 'Role', self::ROLES, $e);
        $pass = Input::password($d, $e, true);
        Input::assertValid($e);
        $this->assertEmailFree((string) $email);

        $id = Db::transaction(function () use ($name, $email, $role, $pass): int {
            $uid = Db::insert(
                'INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)',
                [$name, $email, password_hash((string) $pass, PASSWORD_DEFAULT), $role]
            );
            $this->ensureProfile($uid, (string) $role);
            return $uid;
        });
        return $this->accountRow($id);
    }

    public function accountUpdate(Request $req, array $p, array $me): array
    {
        $id = (int) $p['id'];
        $existing = Db::one('SELECT * FROM users WHERE id = ?', [$id]);
        if (!$existing) {
            throw new ApiException(404, 'Akun tidak ditemukan.');
        }
        $d = $req->input();
        $e = [];
        $name = Input::str($d, 'name', 'Nama', $e, true, 150);
        $email = Input::email($d, $e);
        $role = Input::enum($d, 'role', 'Role', self::ROLES, $e);
        $status = Input::enum($d, 'status', 'Status', ['Aktif', 'Nonaktif'], $e, false) ?? $existing['status'];
        $pass = Input::password($d, $e, false);
        Input::assertValid($e);
        $this->assertEmailFree((string) $email, $id);

        if ((int) $me['id'] === $id && ($role !== $existing['role'] || $status !== 'Aktif')) {
            throw new ApiException(422, 'Anda tidak dapat mengubah role atau menonaktifkan akun Anda sendiri.');
        }

        Db::transaction(function () use ($id, $name, $email, $role, $status, $pass): void {
            Db::exec('UPDATE users SET name=?, email=?, role=?, status=? WHERE id=?', [$name, $email, $role, $status, $id]);
            if ($pass !== null) {
                Db::exec('UPDATE users SET password_hash=? WHERE id=?', [password_hash($pass, PASSWORD_DEFAULT), $id]);
            }
            $this->ensureProfile($id, (string) $role);
        });
        return $this->accountRow($id);
    }

    public function accountDelete(Request $req, array $p, array $me): array
    {
        $id = (int) $p['id'];
        if ((int) $me['id'] === $id) {
            throw new ApiException(422, 'Anda tidak dapat menghapus akun Anda sendiri.');
        }
        if (Db::exec('DELETE FROM users WHERE id = ?', [$id]) === 0) {
            throw new ApiException(404, 'Akun tidak ditemukan.');
        }
        return ['deleted' => true];
    }

    // ------------------------------------------------------------ kelas
    public function classCreate(Request $req): array
    {
        [$name, $majorId, $waliId, $year] = $this->classInput($req->input());
        $this->assertClassNameFree($name);
        $id = Db::insert(
            'INSERT INTO classes (name, major_id, wali_teacher_id, academic_year) VALUES (?,?,?,?)',
            [$name, $majorId, $waliId, $year]
        );
        return PeopleController::classList($id)[0];
    }

    public function classUpdate(Request $req, array $p): array
    {
        $id = (int) $p['id'];
        $this->assertExists('classes', $id, 'Kelas tidak ditemukan.');
        [$name, $majorId, $waliId, $year] = $this->classInput($req->input());
        $this->assertClassNameFree($name, $id);
        Db::exec(
            'UPDATE classes SET name=?, major_id=?, wali_teacher_id=?, academic_year=? WHERE id=?',
            [$name, $majorId, $waliId, $year, $id]
        );
        return PeopleController::classList($id)[0];
    }

    public function classDelete(Request $req, array $p): array
    {
        $id = (int) $p['id'];
        $this->assertExists('classes', $id, 'Kelas tidak ditemukan.');
        if ((int) Db::value('SELECT COUNT(*) FROM students WHERE class_id = ?', [$id]) > 0) {
            throw new ApiException(409, 'Kelas masih memiliki siswa. Pindahkan siswa terlebih dahulu.');
        }
        Db::exec('DELETE FROM classes WHERE id = ?', [$id]);
        return ['deleted' => true];
    }

    // ------------------------------------------------------------ guru
    public function teacherCreate(Request $req): array
    {
        $d = $req->input();
        $e = [];
        $name = Input::str($d, 'name', 'Nama', $e, true, 150);
        $email = Input::email($d, $e);
        $pass = Input::password($d, $e, true);
        $nip = Input::str($d, 'nip', 'NIP', $e, false, 30);
        $subject = Input::str($d, 'subject', 'Mata pelajaran', $e, false, 120);
        $classIds = $this->classIdsInput($d, $e);
        Input::assertValid($e);
        $this->assertEmailFree((string) $email);
        $this->assertNipFree($nip);

        $tid = Db::transaction(function () use ($name, $email, $pass, $nip, $subject, $classIds): int {
            $uid = Db::insert(
                'INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,\'guru\')',
                [$name, $email, password_hash((string) $pass, PASSWORD_DEFAULT)]
            );
            $tid = Db::insert(
                'INSERT INTO teachers (user_id, nip, subject_id) VALUES (?,?,?)',
                [$uid, $nip, $this->subjectId($subject)]
            );
            $this->syncTeacherClasses($tid, $classIds);
            return $tid;
        });
        return PeopleController::teacherList($tid)[0];
    }

    public function teacherUpdate(Request $req, array $p): array
    {
        $tid = (int) $p['id'];
        $t = Db::one('SELECT id, user_id FROM teachers WHERE id = ?', [$tid]);
        if (!$t) {
            throw new ApiException(404, 'Guru tidak ditemukan.');
        }
        $d = $req->input();
        $e = [];
        $name = Input::str($d, 'name', 'Nama', $e, true, 150);
        $email = Input::email($d, $e);
        $pass = Input::password($d, $e, false);
        $nip = Input::str($d, 'nip', 'NIP', $e, false, 30);
        $subject = Input::str($d, 'subject', 'Mata pelajaran', $e, false, 120);
        $classIds = $this->classIdsInput($d, $e);
        $status = Input::enum($d, 'status', 'Status', ['Aktif', 'Nonaktif'], $e, false) ?? 'Aktif';
        Input::assertValid($e);
        $uid = (int) $t['user_id'];
        $this->assertEmailFree((string) $email, $uid);
        $this->assertNipFree($nip, $tid);

        Db::transaction(function () use ($tid, $uid, $name, $email, $pass, $nip, $subject, $classIds, $status): void {
            Db::exec('UPDATE users SET name=?, email=?, status=? WHERE id=?', [$name, $email, $status, $uid]);
            if ($pass !== null) {
                Db::exec('UPDATE users SET password_hash=? WHERE id=?', [password_hash($pass, PASSWORD_DEFAULT), $uid]);
            }
            Db::exec('UPDATE teachers SET nip=?, subject_id=? WHERE id=?', [$nip, $this->subjectId($subject), $tid]);
            $this->syncTeacherClasses($tid, $classIds);
        });
        return PeopleController::teacherList($tid)[0];
    }

    public function teacherDelete(Request $req, array $p): array
    {
        $t = Db::one('SELECT user_id FROM teachers WHERE id = ?', [(int) $p['id']]);
        if (!$t) {
            throw new ApiException(404, 'Guru tidak ditemukan.');
        }
        // Menghapus user otomatis menghapus profil guru beserta materi/asesmen/tugas miliknya (ON DELETE CASCADE).
        Db::exec('DELETE FROM users WHERE id = ?', [(int) $t['user_id']]);
        return ['deleted' => true];
    }

    // ------------------------------------------------------------ siswa
    public function studentCreate(Request $req): array
    {
        $d = $req->input();
        $e = [];
        $name = Input::str($d, 'name', 'Nama', $e, true, 150);
        $email = Input::email($d, $e);
        $pass = Input::password($d, $e, true);
        $nis = Input::str($d, 'nis', 'NIS', $e, false, 20);
        $classId = Input::int($d, 'class_id', 'Kelas', $e, false, 1);
        Input::assertValid($e);
        $this->assertEmailFree((string) $email);
        $this->assertNisFree($nis);
        if ($classId !== null) {
            $this->assertExists('classes', $classId, 'Kelas tidak ditemukan.');
        }
        $sid = Db::transaction(function () use ($name, $email, $pass, $nis, $classId): int {
            $uid = Db::insert(
                'INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,\'siswa\')',
                [$name, $email, password_hash((string) $pass, PASSWORD_DEFAULT)]
            );
            return Db::insert('INSERT INTO students (user_id, nis, class_id) VALUES (?,?,?)', [$uid, $nis, $classId]);
        });
        return PeopleController::studentList(null, $sid)[0];
    }

    public function studentUpdate(Request $req, array $p): array
    {
        $sid = (int) $p['id'];
        $s = Db::one('SELECT id, user_id FROM students WHERE id = ?', [$sid]);
        if (!$s) {
            throw new ApiException(404, 'Siswa tidak ditemukan.');
        }
        $d = $req->input();
        $e = [];
        $name = Input::str($d, 'name', 'Nama', $e, true, 150);
        $email = Input::email($d, $e);
        $pass = Input::password($d, $e, false);
        $nis = Input::str($d, 'nis', 'NIS', $e, false, 20);
        $classId = Input::int($d, 'class_id', 'Kelas', $e, false, 1);
        $status = Input::enum($d, 'status', 'Status', ['Aktif', 'Nonaktif'], $e, false) ?? 'Aktif';
        Input::assertValid($e);
        $uid = (int) $s['user_id'];
        $this->assertEmailFree((string) $email, $uid);
        $this->assertNisFree($nis, $sid);
        if ($classId !== null) {
            $this->assertExists('classes', $classId, 'Kelas tidak ditemukan.');
        }
        Db::transaction(function () use ($sid, $uid, $name, $email, $pass, $nis, $classId, $status): void {
            Db::exec('UPDATE users SET name=?, email=?, status=? WHERE id=?', [$name, $email, $status, $uid]);
            if ($pass !== null) {
                Db::exec('UPDATE users SET password_hash=? WHERE id=?', [password_hash($pass, PASSWORD_DEFAULT), $uid]);
            }
            Db::exec('UPDATE students SET nis=?, class_id=? WHERE id=?', [$nis, $classId, $sid]);
        });
        return PeopleController::studentList(null, $sid)[0];
    }

    public function studentDelete(Request $req, array $p): array
    {
        $s = Db::one('SELECT user_id FROM students WHERE id = ?', [(int) $p['id']]);
        if (!$s) {
            throw new ApiException(404, 'Siswa tidak ditemukan.');
        }
        Db::exec('DELETE FROM users WHERE id = ?', [(int) $s['user_id']]);
        return ['deleted' => true];
    }

    // ------------------------------------------------------------ helper
    /** Tahun ajaran berjalan (Juli - Juni), mis. 2026/2027. */
    public static function currentAcademicYear(): string
    {
        $y = (int) date('Y');
        return ((int) date('n') >= 7) ? $y . '/' . ($y + 1) : ($y - 1) . '/' . $y;
    }

    private function accountRow(int $id): array
    {
        $u = Db::one('SELECT id, name, email, role, status, last_login FROM users WHERE id = ?', [$id]);
        $u['id'] = (int) $u['id'];
        return $u;
    }

    private function ensureProfile(int $userId, string $role): void
    {
        if ($role === 'guru' && !Db::value('SELECT 1 FROM teachers WHERE user_id = ?', [$userId])) {
            Db::exec('INSERT INTO teachers (user_id) VALUES (?)', [$userId]);
        }
        if ($role === 'siswa' && !Db::value('SELECT 1 FROM students WHERE user_id = ?', [$userId])) {
            Db::exec('INSERT INTO students (user_id) VALUES (?)', [$userId]);
        }
    }

    private function assertEmailFree(string $email, ?int $exceptUserId = null): void
    {
        $sql = 'SELECT id FROM users WHERE email = ?';
        $params = [$email];
        if ($exceptUserId !== null) {
            $sql .= ' AND id <> ?';
            $params[] = $exceptUserId;
        }
        if (Db::value($sql, $params)) {
            throw new ApiException(422, 'Email sudah digunakan akun lain.', ['email' => 'Email sudah digunakan.']);
        }
    }

    private function assertNipFree(?string $nip, ?int $exceptTeacherId = null): void
    {
        if ($nip === null) {
            return;
        }
        $sql = 'SELECT id FROM teachers WHERE nip = ?';
        $params = [$nip];
        if ($exceptTeacherId !== null) {
            $sql .= ' AND id <> ?';
            $params[] = $exceptTeacherId;
        }
        if (Db::value($sql, $params)) {
            throw new ApiException(422, 'NIP sudah terdaftar.', ['nip' => 'NIP sudah terdaftar.']);
        }
    }

    private function assertNisFree(?string $nis, ?int $exceptStudentId = null): void
    {
        if ($nis === null) {
            return;
        }
        $sql = 'SELECT id FROM students WHERE nis = ?';
        $params = [$nis];
        if ($exceptStudentId !== null) {
            $sql .= ' AND id <> ?';
            $params[] = $exceptStudentId;
        }
        if (Db::value($sql, $params)) {
            throw new ApiException(422, 'NIS sudah terdaftar.', ['nis' => 'NIS sudah terdaftar.']);
        }
    }

    private function assertClassNameFree(string $name, ?int $exceptId = null): void
    {
        $sql = 'SELECT id FROM classes WHERE name = ?';
        $params = [$name];
        if ($exceptId !== null) {
            $sql .= ' AND id <> ?';
            $params[] = $exceptId;
        }
        if (Db::value($sql, $params)) {
            throw new ApiException(422, 'Nama kelas sudah ada.', ['name' => 'Nama kelas sudah ada.']);
        }
    }

    private function assertExists(string $table, int $id, string $message): void
    {
        // $table hanya berasal dari literal di dalam class ini (bukan input user).
        if (!Db::value("SELECT 1 FROM `$table` WHERE id = ?", [$id])) {
            throw new ApiException(404, $message);
        }
    }

    /** @return array{0:string,1:?int,2:?int,3:string} */
    private function classInput(array $d): array
    {
        $e = [];
        $name = Input::str($d, 'name', 'Nama kelas', $e, true, 60);
        $majorId = Input::int($d, 'major_id', 'Jurusan', $e, true, 1);
        $waliId = Input::int($d, 'wali_teacher_id', 'Wali kelas', $e, false, 1);
        $year = Input::str($d, 'year', 'Tahun ajaran', $e, false, 9) ?? self::currentAcademicYear();
        Input::assertValid($e);
        $this->assertExists('majors', (int) $majorId, 'Jurusan tidak ditemukan.');
        if ($waliId !== null) {
            $this->assertExists('teachers', $waliId, 'Wali kelas tidak ditemukan.');
        }
        return [(string) $name, $majorId, $waliId, $year];
    }

    /** @return int[] */
    private function classIdsInput(array $d, array &$errors): array
    {
        $raw = $d['class_ids'] ?? [];
        if (!is_array($raw)) {
            $errors['class_ids'] = 'Format kelas tidak valid.';
            return [];
        }
        $ids = array_values(array_unique(array_map('intval', $raw)));
        if ($ids) {
            $found = (int) Db::value(
                'SELECT COUNT(*) FROM classes WHERE id IN (' . implode(',', array_fill(0, count($ids), '?')) . ')',
                $ids
            );
            if ($found !== count($ids)) {
                $errors['class_ids'] = 'Ada kelas yang tidak ditemukan.';
            }
        }
        return $ids;
    }

    private function syncTeacherClasses(int $teacherId, array $classIds): void
    {
        Db::exec('DELETE FROM teacher_classes WHERE teacher_id = ?', [$teacherId]);
        foreach ($classIds as $cid) {
            Db::exec('INSERT INTO teacher_classes (teacher_id, class_id) VALUES (?,?)', [$teacherId, $cid]);
        }
    }

    /** Cari mata pelajaran berdasarkan nama; buat baru bila belum ada. */
    private function subjectId(?string $name): ?int
    {
        if ($name === null) {
            return null;
        }
        $id = Db::value('SELECT id FROM subjects WHERE name = ?', [$name]);
        if ($id) {
            return (int) $id;
        }
        return Db::insert('INSERT INTO subjects (name) VALUES (?)', [$name]);
    }
}
