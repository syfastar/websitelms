<?php
declare(strict_types=1);

namespace App\Controllers;

use App\ApiException;
use App\Auth;
use App\Db;
use App\Input;
use App\Num;
use App\Request;
use App\Upload;

final class SiswaController
{
    /** Toleransi (detik) setelah durasi habis sebelum jawaban dianggap tidak sah. */
    private const GRACE_SECONDS = 120;

    /** @return array{id:int,class_id:?int} */
    private function student(array $user): array
    {
        $s = Db::one('SELECT id, class_id FROM students WHERE user_id = ?', [(int) $user['id']]);
        if (!$s) {
            throw new ApiException(403, 'Profil siswa untuk akun ini belum dibuat. Hubungi administrator.');
        }
        return ['id' => (int) $s['id'], 'class_id' => $s['class_id'] === null ? null : (int) $s['class_id']];
    }

    // =========================================================== dashboard
    public function dashboard(Request $req, array $p, array $user): array
    {
        $st = $this->student($user);
        $assignments = $this->assignmentRows($st);
        $exams = $this->examRows($st);

        $scores = array_column(Db::all(
            'SELECT score FROM assessment_attempts WHERE student_id = ? AND submitted_at IS NOT NULL AND score IS NOT NULL',
            [$st['id']]
        ), 'score');
        $scores = array_merge($scores, array_column(Db::all(
            'SELECT score FROM submissions WHERE student_id = ? AND score IS NOT NULL',
            [$st['id']]
        ), 'score'));
        $avg = $scores ? round(array_sum(array_map('floatval', $scores)) / count($scores), 1) : null;

        return [
            'profile' => Auth::profile($user),
            'stats'   => [
                'materials'          => $st['class_id'] === null ? 0 : (int) Db::value('SELECT COUNT(*) FROM materials WHERE class_id = ?', [$st['class_id']]),
                'active_assignments' => count(array_filter($assignments, static fn($a) => $a['status'] !== 'Sudah Dikumpulkan')),
                'exams_available'    => count(array_filter($exams, static fn($e) => $e['status'] === 'Tersedia')),
                'average'            => $avg,
            ],
            'assignments' => array_slice($assignments, 0, 5),
            'exams'       => array_slice($exams, 0, 5),
        ];
    }

    // =========================================================== materi
    public function materials(Request $req, array $p, array $user): array
    {
        $st = $this->student($user);
        if ($st['class_id'] === null) {
            return [];
        }
        $rows = Db::all(
            'SELECT m.id, m.title, m.type, m.class_id, c.name AS class_name, sb.name AS subject, u.name AS teacher,
                    m.file_name, m.file_size, m.file_path, m.external_url, m.created_at
             FROM materials m
             JOIN classes c ON c.id = m.class_id
             JOIN subjects sb ON sb.id = m.subject_id
             JOIN teachers t ON t.id = m.teacher_id
             JOIN users u ON u.id = t.user_id
             WHERE m.class_id = ?
             ORDER BY m.created_at DESC, m.id DESC',
            [$st['class_id']]
        );
        return array_map([GuruController::class, 'materialRow'], $rows);
    }

    // =========================================================== tugas
    private function assignmentRows(array $st, ?int $onlyId = null): array
    {
        if ($st['class_id'] === null) {
            return [];
        }
        $sql = 'SELECT a.id, a.title, a.description, a.type, a.deadline, sb.name AS subject, u.name AS teacher,
                       s.id AS sub_id, s.submitted_at, s.score, s.feedback, s.file_name, s.note
                FROM assignments a
                JOIN subjects sb ON sb.id = a.subject_id
                JOIN teachers t ON t.id = a.teacher_id
                JOIN users u ON u.id = t.user_id
                LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = ?
                WHERE a.class_id = ?';
        $params = [$st['id'], $st['class_id']];
        if ($onlyId !== null) {
            $sql .= ' AND a.id = ?';
            $params[] = $onlyId;
        }
        $today = date('Y-m-d');
        $rows = Db::all($sql . ' ORDER BY a.deadline DESC, a.id DESC', $params);
        return array_map(static function (array $r) use ($today): array {
            $status = $r['sub_id'] !== null ? 'Sudah Dikumpulkan' : ($r['deadline'] < $today ? 'Terlambat' : 'Belum Dikumpulkan');
            return [
                'id'           => (int) $r['id'],
                'title'        => $r['title'],
                'description'  => $r['description'],
                'type'         => $r['type'],
                'subject'      => $r['subject'],
                'teacher'      => $r['teacher'],
                'deadline'     => $r['deadline'],
                'status'       => $status,
                'submitted_at' => $r['submitted_at'],
                'submission_id' => $r['sub_id'] === null ? null : (int) $r['sub_id'],
                'note'         => $r['note'],
                'file_name'    => $r['file_name'],
                'has_file'     => $r['file_name'] !== null,
                'score'        => Num::f($r['score'], 1),
                'feedback'     => $r['feedback'],
            ];
        }, $rows);
    }

    public function assignments(Request $req, array $p, array $user): array
    {
        return $this->assignmentRows($this->student($user));
    }

    public function assignmentSubmit(Request $req, array $p, array $user): array
    {
        $st = $this->student($user);
        $id = (int) $p['id'];
        $a = $st['class_id'] === null ? null : Db::one('SELECT id FROM assignments WHERE id = ? AND class_id = ?', [$id, $st['class_id']]);
        if (!$a) {
            throw new ApiException(404, 'Tugas tidak ditemukan.');
        }
        $existing = Db::one('SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?', [$id, $st['id']]);
        if ($existing && $existing['score'] !== null) {
            throw new ApiException(409, 'Tugas sudah dinilai guru dan tidak dapat dikumpulkan ulang.');
        }

        $e = [];
        $note = Input::str($req->input(), 'note', 'Catatan', $e, false, 5000);
        Input::assertValid($e);
        $file = $req->file('file');
        if ($note === null && !$file && !($existing && $existing['file_path'] !== null)) {
            throw new ApiException(422, 'Isi jawaban/catatan atau unggah file tugas.', ['note' => 'Jawaban atau file wajib diisi.']);
        }

        $saved = $file ? Upload::save($file, 'submissions') : null;
        try {
            if ($existing) {
                Db::exec(
                    'UPDATE submissions SET note=?, file_path=?, file_name=?, submitted_at=? WHERE id=?',
                    [$note, $saved['path'] ?? $existing['file_path'], $saved['name'] ?? $existing['file_name'], date('Y-m-d H:i:s'), $existing['id']]
                );
                if ($saved) {
                    Upload::delete($existing['file_path']);
                }
            } else {
                Db::insert(
                    'INSERT INTO submissions (assignment_id, student_id, note, file_path, file_name, submitted_at) VALUES (?,?,?,?,?,?)',
                    [$id, $st['id'], $note, $saved['path'] ?? null, $saved['name'] ?? null, date('Y-m-d H:i:s')]
                );
            }
        } catch (\Throwable $ex) {
            if ($saved) {
                Upload::delete($saved['path']);
            }
            throw $ex;
        }
        return $this->assignmentRows($st, $id)[0];
    }

    // =========================================================== ujian
    private function examRows(array $st, ?int $onlyId = null): array
    {
        if ($st['class_id'] === null) {
            return [];
        }
        $sql = "SELECT a.id, a.title, a.type, a.start_date, a.due_date, a.duration_minutes, sb.name AS subject,
                       (SELECT COUNT(*) FROM assessment_questions q WHERE q.assessment_id = a.id) AS qcount,
                       t.id AS attempt_id, t.submitted_at, t.score
                FROM assessments a
                JOIN subjects sb ON sb.id = a.subject_id
                LEFT JOIN assessment_attempts t ON t.assessment_id = a.id AND t.student_id = ?
                WHERE a.class_id = ? AND a.status = 'Aktif'";
        $params = [$st['id'], $st['class_id']];
        if ($onlyId !== null) {
            $sql .= ' AND a.id = ?';
            $params[] = $onlyId;
        }
        $today = date('Y-m-d');
        $rows = Db::all($sql . ' ORDER BY a.start_date DESC, a.id DESC', $params);
        return array_map(static function (array $r) use ($today): array {
            $done = $r['submitted_at'] !== null;
            if ($done) {
                $status = 'Selesai';
            } elseif ($r['attempt_id'] === null && $r['start_date'] > $today) {
                $status = 'Mendatang';
            } elseif ($r['attempt_id'] === null && $r['due_date'] < $today) {
                $status = 'Ditutup';
            } else {
                $status = 'Tersedia';
            }
            return [
                'id'               => (int) $r['id'],
                'title'            => $r['title'],
                'type'             => $r['type'],
                'subject'          => $r['subject'],
                'start_date'       => $r['start_date'],
                'due_date'         => $r['due_date'],
                'duration_minutes' => (int) $r['duration_minutes'],
                'questions'        => (int) $r['qcount'],
                'status'           => $status,
                'in_progress'      => $r['attempt_id'] !== null && !$done,
                'score'            => $done ? Num::f($r['score'], 1) : null,
            ];
        }, $rows);
    }

    public function exams(Request $req, array $p, array $user): array
    {
        $st = $this->student($user);
        $this->closeExpired($st['id']);
        return $this->examRows($st);
    }

    public function examStart(Request $req, array $p, array $user): array
    {
        $st = $this->student($user);
        $this->closeExpired($st['id']);
        $id = (int) $p['id'];
        $exam = $st['class_id'] === null ? null : Db::one(
            "SELECT a.id, a.title, a.type, a.start_date, a.due_date, a.duration_minutes, sb.name AS subject
             FROM assessments a JOIN subjects sb ON sb.id = a.subject_id
             WHERE a.id = ? AND a.class_id = ? AND a.status = 'Aktif'",
            [$id, $st['class_id']]
        );
        if (!$exam) {
            throw new ApiException(404, 'Ujian tidak ditemukan.');
        }
        $attempt = Db::one('SELECT * FROM assessment_attempts WHERE assessment_id = ? AND student_id = ?', [$id, $st['id']]);
        if ($attempt && $attempt['submitted_at'] !== null) {
            throw new ApiException(409, 'Anda sudah mengerjakan ujian ini.');
        }
        if (!$attempt) {
            $today = date('Y-m-d');
            if ($exam['start_date'] > $today) {
                throw new ApiException(409, 'Ujian ini belum dimulai (mulai ' . $exam['start_date'] . ').');
            }
            if ($exam['due_date'] < $today) {
                throw new ApiException(409, 'Ujian ini sudah ditutup.');
            }
            $qn = (int) Db::value('SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = ?', [$id]);
            if ($qn === 0) {
                throw new ApiException(409, 'Ujian ini belum memiliki soal.');
            }
            try {
                Db::insert(
                    'INSERT INTO assessment_attempts (assessment_id, student_id, started_at) VALUES (?,?,?)',
                    [$id, $st['id'], date('Y-m-d H:i:s')]
                );
            } catch (\PDOException $ex) {
                if ($ex->getCode() !== '23000') { // 23000 = sudah ada (double klik / dua tab)
                    throw $ex;
                }
            }
            $attempt = Db::one('SELECT * FROM assessment_attempts WHERE assessment_id = ? AND student_id = ?', [$id, $st['id']]);
        }

        $remaining = max(0, (int) $exam['duration_minutes'] * 60 - (time() - strtotime((string) $attempt['started_at'])));
        $questions = array_map(static fn(array $q): array => [
            'id'       => (int) $q['id'],
            'question' => $q['question'],
            'options'  => ['A' => $q['option_a'], 'B' => $q['option_b'], 'C' => $q['option_c'], 'D' => $q['option_d']],
        ], Db::all(
            'SELECT id, question, option_a, option_b, option_c, option_d
             FROM assessment_questions WHERE assessment_id = ? ORDER BY position, id',
            [$id]
        ));

        return [
            'exam'              => [
                'id' => (int) $exam['id'], 'title' => $exam['title'], 'subject' => $exam['subject'],
                'duration_minutes' => (int) $exam['duration_minutes'],
            ],
            'remaining_seconds' => $remaining,
            'questions'         => $questions,
        ];
    }

    public function examSubmit(Request $req, array $p, array $user): array
    {
        $st = $this->student($user);
        $this->closeExpired($st['id']);
        $id = (int) $p['id'];
        $attempt = Db::one('SELECT * FROM assessment_attempts WHERE assessment_id = ? AND student_id = ?', [$id, $st['id']]);
        if (!$attempt) {
            throw new ApiException(404, 'Mulai ujian terlebih dahulu sebelum mengumpulkan jawaban.');
        }
        if ($attempt['submitted_at'] !== null) {
            throw new ApiException(409, 'Ujian sudah dikumpulkan atau waktu ujian telah habis.');
        }
        $answers = $req->input()['answers'] ?? [];
        if (!is_array($answers)) {
            throw new ApiException(422, 'Format jawaban tidak valid.');
        }
        $questions = Db::all('SELECT id, correct_option FROM assessment_questions WHERE assessment_id = ?', [$id]);
        $total = count($questions);
        $correct = 0;

        Db::transaction(function () use ($questions, $answers, $attempt, &$correct): void {
            foreach ($questions as $q) {
                $chosen = $answers[(string) $q['id']] ?? null;
                $chosen = is_string($chosen) && in_array($chosen, ['A', 'B', 'C', 'D'], true) ? $chosen : null;
                Db::exec(
                    'INSERT INTO attempt_answers (attempt_id, question_id, chosen_option) VALUES (?,?,?)',
                    [(int) $attempt['id'], (int) $q['id'], $chosen]
                );
                if ($chosen !== null && $chosen === $q['correct_option']) {
                    $correct++;
                }
            }
        });
        $score = $total > 0 ? round($correct / $total * 100, 2) : 0.0;
        Db::exec(
            'UPDATE assessment_attempts SET submitted_at = ?, score = ? WHERE id = ?',
            [date('Y-m-d H:i:s'), $score, (int) $attempt['id']]
        );
        return ['score' => round($score, 1), 'correct' => $correct, 'total' => $total];
    }

    /** Tutup otomatis percobaan ujian yang waktunya habis (skor 0 bila tidak pernah dikumpulkan). */
    private function closeExpired(int $studentId): void
    {
        $rows = Db::all(
            'SELECT t.id, t.started_at, a.duration_minutes
             FROM assessment_attempts t JOIN assessments a ON a.id = t.assessment_id
             WHERE t.student_id = ? AND t.submitted_at IS NULL',
            [$studentId]
        );
        foreach ($rows as $r) {
            $expiry = strtotime((string) $r['started_at']) + (int) $r['duration_minutes'] * 60 + self::GRACE_SECONDS;
            if (time() > $expiry) {
                Db::exec(
                    'UPDATE assessment_attempts SET submitted_at = ?, score = 0 WHERE id = ? AND submitted_at IS NULL',
                    [date('Y-m-d H:i:s', $expiry), (int) $r['id']]
                );
            }
        }
    }
}
