<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Db;
use App\Request;

/** Daftar guru / siswa / kelas + data referensi (dipakai banyak role). */
final class PeopleController
{
    public static function teacherList(?int $onlyId = null): array
    {
        $sql = 'SELECT t.id, t.user_id, t.nip, t.subject_id, u.name, u.email, u.status, sb.name AS subject
                FROM teachers t
                JOIN users u ON u.id = t.user_id
                LEFT JOIN subjects sb ON sb.id = t.subject_id';
        $params = [];
        if ($onlyId !== null) {
            $sql .= ' WHERE t.id = ?';
            $params[] = $onlyId;
        }
        $rows = Db::all($sql . ' ORDER BY u.name', $params);

        $classes = Db::all(
            'SELECT tc.teacher_id, c.id, c.name FROM teacher_classes tc JOIN classes c ON c.id = tc.class_id ORDER BY c.name'
        );
        $byTeacher = [];
        foreach ($classes as $c) {
            $byTeacher[(int) $c['teacher_id']][] = ['id' => (int) $c['id'], 'name' => $c['name']];
        }
        return array_map(static function (array $r) use ($byTeacher): array {
            $cl = $byTeacher[(int) $r['id']] ?? [];
            return [
                'id'          => (int) $r['id'],
                'user_id'     => (int) $r['user_id'],
                'name'        => $r['name'],
                'nip'         => $r['nip'],
                'email'       => $r['email'],
                'status'      => $r['status'],
                'subject_id'  => $r['subject_id'] === null ? null : (int) $r['subject_id'],
                'subject'     => $r['subject'],
                'classes'     => $cl,
                'class_ids'   => array_column($cl, 'id'),
                'class_names' => implode(', ', array_column($cl, 'name')),
            ];
        }, $rows);
    }

    public static function studentList(?array $classIds = null, ?int $onlyId = null): array
    {
        $sql = 'SELECT s.id, s.user_id, s.nis, s.class_id, u.name, u.email, u.status,
                       c.name AS class_name, m.name AS major, m.code AS major_code
                FROM students s
                JOIN users u ON u.id = s.user_id
                LEFT JOIN classes c ON c.id = s.class_id
                LEFT JOIN majors m ON m.id = c.major_id';
        $where = [];
        $params = [];
        if ($classIds !== null) {
            if (!$classIds) {
                return [];
            }
            $where[] = 's.class_id IN (' . implode(',', array_fill(0, count($classIds), '?')) . ')';
            array_push($params, ...$classIds);
        }
        if ($onlyId !== null) {
            $where[] = 's.id = ?';
            $params[] = $onlyId;
        }
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $rows = Db::all($sql . ' ORDER BY c.name, u.name', $params);
        return array_map(static fn(array $r): array => [
            'id'         => (int) $r['id'],
            'user_id'    => (int) $r['user_id'],
            'name'       => $r['name'],
            'email'      => $r['email'],
            'nis'        => $r['nis'],
            'class_id'   => $r['class_id'] === null ? null : (int) $r['class_id'],
            'class'      => $r['class_name'],
            'major'      => $r['major'],
            'major_code' => $r['major_code'],
            'status'     => $r['status'],
        ], $rows);
    }

    public static function classList(?int $onlyId = null): array
    {
        $sql = 'SELECT c.id, c.name, c.major_id, c.wali_teacher_id, c.academic_year,
                       m.name AS major, u.name AS wali,
                       (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) AS students
                FROM classes c
                LEFT JOIN majors m ON m.id = c.major_id
                LEFT JOIN teachers t ON t.id = c.wali_teacher_id
                LEFT JOIN users u ON u.id = t.user_id';
        $params = [];
        if ($onlyId !== null) {
            $sql .= ' WHERE c.id = ?';
            $params[] = $onlyId;
        }
        $rows = Db::all($sql . ' ORDER BY c.name', $params);
        return array_map(static fn(array $r): array => [
            'id'              => (int) $r['id'],
            'name'            => $r['name'],
            'major_id'        => $r['major_id'] === null ? null : (int) $r['major_id'],
            'major'           => $r['major'],
            'wali_teacher_id' => $r['wali_teacher_id'] === null ? null : (int) $r['wali_teacher_id'],
            'wali'            => $r['wali'],
            'students'        => (int) $r['students'],
            'year'            => $r['academic_year'],
        ], $rows);
    }

    // ---- endpoint ----

    public function students(Request $req, array $p, array $user): array
    {
        $classIds = null;
        if ($user['role'] === 'guru') {
            $classIds = GuruContext::classIds($user);
        }
        $list = self::studentList($classIds);
        if (!empty($req->query['class_id'])) {
            $cid = (int) $req->query['class_id'];
            $list = array_values(array_filter($list, static fn($s) => $s['class_id'] === $cid));
        }
        return $list;
    }

    public function teachers(): array
    {
        return self::teacherList();
    }

    public function classes(): array
    {
        return self::classList();
    }

    /** Data referensi untuk dropdown form. */
    public function meta(Request $req, array $p, array $user): array
    {
        $role = $user['role'];
        $out = [
            'majors'   => array_map(static fn($m) => ['id' => (int) $m['id'], 'code' => $m['code'], 'name' => $m['name']],
                Db::all('SELECT id, code, name FROM majors ORDER BY name')),
            'subjects' => array_map(static fn($s) => ['id' => (int) $s['id'], 'name' => $s['name']],
                Db::all('SELECT id, name FROM subjects ORDER BY name')),
        ];
        if ($role === 'guru') {
            $ids = GuruContext::classIds($user);
            $all = self::classList();
            $out['classes'] = array_values(array_filter($all, static fn($c) => in_array($c['id'], $ids, true)));
        } elseif (in_array($role, ['admin', 'kurikulum', 'kepsek'], true)) {
            $out['classes'] = self::classList();
        } else {
            $out['classes'] = [];
        }
        if ($role === 'admin') {
            $out['teachers'] = array_map(static fn($t) => ['id' => $t['id'], 'name' => $t['name']], self::teacherList());
        }
        return $out;
    }
}
