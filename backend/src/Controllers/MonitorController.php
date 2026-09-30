<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Db;
use App\Num;

/** Data monitoring untuk Kurikulum & Kepala Sekolah (read-only). */
final class MonitorController
{
    public function summary(): array
    {
        $avg = Db::value('SELECT AVG(score) FROM assessment_attempts WHERE submitted_at IS NOT NULL AND score IS NOT NULL');
        return [
            'stats' => [
                'average'            => Num::f($avg),
                'active_assignments' => (int) Db::value('SELECT COUNT(*) FROM assignments WHERE deadline >= ?', [date('Y-m-d')]),
                'total_assignments'  => (int) Db::value('SELECT COUNT(*) FROM assignments'),
                'teachers'           => (int) Db::value('SELECT COUNT(*) FROM teachers'),
                'students'           => (int) Db::value('SELECT COUNT(*) FROM students'),
                'academic_year'      => Db::value('SELECT academic_year FROM classes ORDER BY academic_year DESC LIMIT 1'),
            ],
            'subjects' => $this->gradeSummary(),
        ];
    }

    public function grades(): array
    {
        return $this->gradeSummary();
    }

    /** Ringkasan nilai per mata pelajaran/guru berdasarkan hasil asesmen yang sudah dikerjakan siswa. */
    private function gradeSummary(): array
    {
        $rows = Db::all(
            'SELECT t.id, sb.name AS subject, u.name AS teacher,
                    COUNT(a.id) AS n, AVG(a.score) AS avg_score, MAX(a.score) AS max_score, MIN(a.score) AS min_score,
                    SUM(CASE WHEN a.score >= ? THEN 1 ELSE 0 END) AS passed
             FROM teachers t
             JOIN users u ON u.id = t.user_id
             JOIN subjects sb ON sb.id = t.subject_id
             LEFT JOIN assessments x ON x.teacher_id = t.id AND x.status = \'Aktif\'
             LEFT JOIN assessment_attempts a ON a.assessment_id = x.id AND a.submitted_at IS NOT NULL
             GROUP BY t.id, sb.name, u.name
             ORDER BY sb.name',
            [Grading::kkm()]
        );
        return array_map(static function (array $r): array {
            $n = (int) $r['n'];
            return [
                'subject' => $r['subject'],
                'teacher' => $r['teacher'],
                'count'   => $n,
                'avg'     => $n ? Num::f($r['avg_score']) : null,
                'highest' => $n ? Num::f($r['max_score']) : null,
                'lowest'  => $n ? Num::f($r['min_score']) : null,
                'pass'    => $n ? (int) round(100 * (int) $r['passed'] / $n) : null,
            ];
        }, $rows);
    }

    public function assignments(): array
    {
        $rows = Db::all(
            'SELECT a.id, a.title, a.type, a.deadline, c.name AS class_name, u.name AS teacher, sb.name AS subject,
                    (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) AS submitted,
                    (SELECT COUNT(*) FROM students st WHERE st.class_id = a.class_id) AS total
             FROM assignments a
             JOIN classes c ON c.id = a.class_id
             JOIN subjects sb ON sb.id = a.subject_id
             JOIN teachers t ON t.id = a.teacher_id
             JOIN users u ON u.id = t.user_id
             ORDER BY a.deadline DESC, a.id DESC'
        );
        return array_map(static fn(array $r): array => [
            'id' => (int) $r['id'], 'title' => $r['title'], 'type' => $r['type'], 'deadline' => $r['deadline'],
            'class' => $r['class_name'], 'teacher' => $r['teacher'], 'subject' => $r['subject'],
            'submitted' => (int) $r['submitted'], 'total' => (int) $r['total'],
        ], $rows);
    }

    public function assessments(): array
    {
        $rows = Db::all(
            'SELECT a.id, a.title, a.type, a.due_date, a.status, c.name AS class_name, u.name AS teacher, sb.name AS subject,
                    (SELECT COUNT(*) FROM assessment_questions q WHERE q.assessment_id = a.id) AS qcount
             FROM assessments a
             JOIN classes c ON c.id = a.class_id
             JOIN subjects sb ON sb.id = a.subject_id
             JOIN teachers t ON t.id = a.teacher_id
             JOIN users u ON u.id = t.user_id
             ORDER BY a.due_date DESC, a.id DESC'
        );
        return array_map(static fn(array $r): array => [
            'id' => (int) $r['id'], 'title' => $r['title'], 'type' => $r['type'], 'due_date' => $r['due_date'],
            'status' => $r['status'], 'class' => $r['class_name'], 'teacher' => $r['teacher'], 'subject' => $r['subject'],
            'questions' => (int) $r['qcount'],
        ], $rows);
    }
}
