<?php
declare(strict_types=1);

namespace App\Controllers;

use App\ApiException;
use App\Db;
use App\Input;
use App\Num;
use App\Request;
use App\Upload;

final class GuruController
{
    // =========================================================== dashboard
    public function dashboard(Request $req, array $p, array $user): array
    {
        $t = GuruContext::teacher($user);
        $classIds = GuruContext::classIds($user);
        $students = 0;
        if ($classIds) {
            $students = (int) Db::value(
                'SELECT COUNT(*) FROM students WHERE class_id IN (' . implode(',', array_fill(0, count($classIds), '?')) . ')',
                $classIds
            );
        }
        return [
            'stats' => [
                'materials'   => (int) Db::value('SELECT COUNT(*) FROM materials WHERE teacher_id = ?', [$t['id']]),
                'assessments' => (int) Db::value('SELECT COUNT(*) FROM assessments WHERE teacher_id = ?', [$t['id']]),
                'assignments' => (int) Db::value('SELECT COUNT(*) FROM assignments WHERE teacher_id = ?', [$t['id']]),
                'students'    => $students,
            ],
            'assessments' => array_slice($this->assessmentRows($t['id']), 0, 5),
            'assignments' => array_slice($this->assignmentRows($t['id']), 0, 5),
        ];
    }

    // =========================================================== materi
    public static function materialRow(array $r): array
    {
        return [
            'id'           => (int) $r['id'],
            'title'        => $r['title'],
            'type'         => $r['type'],
            'class_id'     => (int) $r['class_id'],
            'class'        => $r['class_name'],
            'subject'      => $r['subject'],
            'teacher'      => $r['teacher'] ?? null,
            'file_name'    => $r['file_name'],
            'size'         => $r['file_size'] === null ? null : (int) $r['file_size'],
            'has_file'     => $r['file_path'] !== null,
            'external_url' => $r['external_url'],
            'uploaded'     => substr((string) $r['created_at'], 0, 10),
        ];
    }

    public function materials(Request $req, array $p, array $user): array
    {
        $t = GuruContext::teacher($user);
        $rows = Db::all(
            'SELECT m.id, m.title, m.type, m.class_id, c.name AS class_name, sb.name AS subject,
                    m.file_name, m.file_size, m.file_path, m.external_url, m.created_at
             FROM materials m
             JOIN classes c ON c.id = m.class_id
             JOIN subjects sb ON sb.id = m.subject_id
             WHERE m.teacher_id = ?
             ORDER BY m.created_at DESC, m.id DESC',
            [$t['id']]
        );
        return array_map([self::class, 'materialRow'], $rows);
    }

    /** Dipakai untuk POST /materials (buat) dan POST|PUT /materials/{id} (ubah). */
    public function materialSave(Request $req, array $p, array $user): array
    {
        $t = GuruContext::teacher($user);
        $id = isset($p['id']) ? (int) $p['id'] : null;
        $existing = null;
        if ($id !== null) {
            $existing = Db::one('SELECT * FROM materials WHERE id = ? AND teacher_id = ?', [$id, $t['id']]);
            if (!$existing) {
                throw new ApiException(404, 'Materi tidak ditemukan.');
            }
        }
        $d = $req->input();
        $e = [];
        $title = Input::str($d, 'title', 'Judul materi', $e, true, 200);
        $classId = Input::int($d, 'class_id', 'Kelas', $e, true, 1);
        $type = Input::enum($d, 'type', 'Tipe', ['PDF', 'Video', 'Presentasi'], $e);
        $url = Input::url($d, 'external_url', 'Link materi', $e);
        Input::assertValid($e);
        GuruContext::assertCanTeach($t, (int) $classId);

        $file = $req->file('file');
        if (!$file && $url === null && !($existing && $existing['file_path'] !== null)) {
            throw new ApiException(422, 'Unggah file materi atau isi link materi.', ['file' => 'File atau link wajib diisi.']);
        }

        $saved = $file ? Upload::save($file, 'materials') : null;
        try {
            if ($existing) {
                $filePath = $saved['path'] ?? $existing['file_path'];
                $fileName = $saved['name'] ?? $existing['file_name'];
                $fileSize = $saved['size'] ?? $existing['file_size'];
                Db::exec(
                    'UPDATE materials SET title=?, class_id=?, subject_id=?, type=?, external_url=?, file_path=?, file_name=?, file_size=? WHERE id=?',
                    [$title, $classId, $t['subject_id'], $type, $url, $filePath, $fileName, $fileSize, $id]
                );
                if ($saved) {
                    Upload::delete($existing['file_path']);
                }
            } else {
                $id = Db::insert(
                    'INSERT INTO materials (teacher_id, class_id, subject_id, title, type, external_url, file_path, file_name, file_size)
                     VALUES (?,?,?,?,?,?,?,?,?)',
                    [$t['id'], $classId, $t['subject_id'], $title, $type, $url, $saved['path'] ?? null, $saved['name'] ?? null, $saved['size'] ?? null]
                );
            }
        } catch (\Throwable $ex) {
            if ($saved) {
                Upload::delete($saved['path']);
            }
            throw $ex;
        }
        return $this->materialOne((int) $id);
    }

    public function materialDelete(Request $req, array $p, array $user): array
    {
        $t = GuruContext::teacher($user);
        $m = Db::one('SELECT id, file_path FROM materials WHERE id = ? AND teacher_id = ?', [(int) $p['id'], $t['id']]);
        if (!$m) {
            throw new ApiException(404, 'Materi tidak ditemukan.');
        }
        Db::exec('DELETE FROM materials WHERE id = ?', [$m['id']]);
        Upload::delete($m['file_path']);
        return ['deleted' => true];
    }

    private function materialOne(int $id): array
    {
        $r = Db::one(
            'SELECT m.id, m.title, m.type, m.class_id, c.name AS class_name, sb.name AS subject,
                    m.file_name, m.file_size, m.file_path, m.external_url, m.created_at
             FROM materials m JOIN classes c ON c.id = m.class_id JOIN subjects sb ON sb.id = m.subject_id
             WHERE m.id = ?',
            [$id]
        );
        return self::materialRow($r);
    }

    // =========================================================== asesmen
    private function assessmentRows(int $teacherId, ?int $onlyId = null): array
    {
        $sql = 'SELECT a.id, a.title, a.type, a.class_id, c.name AS class_name, sb.name AS subject,
                       a.start_date, a.due_date, a.duration_minutes, a.status,
                       (SELECT COUNT(*) FROM assessment_questions q WHERE q.assessment_id = a.id) AS qcount,
                       (SELECT COUNT(*) FROM assessment_attempts t WHERE t.assessment_id = a.id AND t.submitted_at IS NOT NULL) AS acount
                FROM assessments a
                JOIN classes c ON c.id = a.class_id
                JOIN subjects sb ON sb.id = a.subject_id
                WHERE a.teacher_id = ?';
        $params = [$teacherId];
        if ($onlyId !== null) {
            $sql .= ' AND a.id = ?';
            $params[] = $onlyId;
        }
        $rows = Db::all($sql . ' ORDER BY a.due_date DESC, a.id DESC', $params);
        return array_map(static fn(array $r): array => [
            'id'               => (int) $r['id'],
            'title'            => $r['title'],
            'type'             => $r['type'],
            'class_id'         => (int) $r['class_id'],
            'class'            => $r['class_name'],
            'subject'          => $r['subject'],
            'start_date'       => $r['start_date'],
            'due_date'         => $r['due_date'],
            'duration_minutes' => (int) $r['duration_minutes'],
            'status'           => $r['status'],
            'questions'        => (int) $r['qcount'],
            'attempts'         => (int) $r['acount'],
        ], $rows);
    }

    public function assessments(Request $req, array $p, array $user): array
    {
        return $this->assessmentRows(GuruContext::teacher($user)['id']);
    }

    public function assessmentSave(Request $req, array $p, array $user): array
    {
        $t = GuruContext::teacher($user);
        $id = isset($p['id']) ? (int) $p['id'] : null;
        $existing = $id !== null ? $this->ownAssessment($id, $t['id']) : null;

        $d = $req->input();
        $e = [];
        $title = Input::str($d, 'title', 'Judul asesmen', $e, true, 200);
        $type = Input::enum($d, 'type', 'Tipe', ['Kuis', 'Ulangan Harian', 'Ujian Tengah Semester', 'Ujian Akhir Semester'], $e);
        $classId = Input::int($d, 'class_id', 'Kelas', $e, true, 1);
        $start = Input::date($d, 'start_date', 'Tanggal mulai', $e);
        $due = Input::date($d, 'due_date', 'Batas akhir', $e);
        $duration = Input::int($d, 'duration_minutes', 'Durasi (menit)', $e, true, 5, 300);
        $status = Input::enum($d, 'status', 'Status', ['Draft', 'Aktif'], $e);
        Input::assertValid($e);
        if ($start !== null && $due !== null && $due < $start) {
            throw new ApiException(422, 'Batas akhir tidak boleh sebelum tanggal mulai.', ['due_date' => 'Batas akhir tidak boleh sebelum tanggal mulai.']);
        }
        GuruContext::assertCanTeach($t, (int) $classId);

        if ($existing) {
            $attempts = (int) Db::value('SELECT COUNT(*) FROM assessment_attempts WHERE assessment_id = ?', [$id]);
            if ($attempts > 0 && (int) $existing['class_id'] !== $classId) {
                throw new ApiException(409, 'Kelas tidak dapat diubah karena sudah ada siswa yang mengerjakan.');
            }
        }
        if ($status === 'Aktif') {
            $qcount = $id === null ? 0 : (int) Db::value('SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = ?', [$id]);
            if ($qcount === 0) {
                throw new ApiException(422, 'Tambahkan minimal 1 soal sebelum mengaktifkan asesmen (simpan sebagai Draft dulu).', ['status' => 'Belum ada soal.']);
            }
        }

        if ($existing) {
            Db::exec(
                'UPDATE assessments SET title=?, type=?, class_id=?, subject_id=?, start_date=?, due_date=?, duration_minutes=?, status=? WHERE id=?',
                [$title, $type, $classId, $t['subject_id'], $start, $due, $duration, $status, $id]
            );
        } else {
            $id = Db::insert(
                'INSERT INTO assessments (teacher_id, class_id, subject_id, title, type, start_date, due_date, duration_minutes, status)
                 VALUES (?,?,?,?,?,?,?,?,?)',
                [$t['id'], $classId, $t['subject_id'], $title, $type, $start, $due, $duration, $status]
            );
        }
        return $this->assessmentRows($t['id'], (int) $id)[0];
    }

    public function assessmentDelete(Request $req, array $p, array $user): array
    {
        $t = GuruContext::teacher($user);
        $this->ownAssessment((int) $p['id'], $t['id']);
        Db::exec('DELETE FROM assessments WHERE id = ?', [(int) $p['id']]);
        return ['deleted' => true];
    }

    public function questions(Request $req, array $p, array $user): array
    {
        $t = GuruContext::teacher($user);
        $this->ownAssessment((int) $p['id'], $t['id']);
        $rows = Db::all(
            'SELECT id, question, option_a, option_b, option_c, option_d, correct_option
             FROM assessment_questions WHERE assessment_id = ? ORDER BY position, id',
            [(int) $p['id']]
        );
        return array_map(static fn(array $q): array => [
            'id'             => (int) $q['id'],
            'question'       => $q['question'],
            'option_a'       => $q['option_a'],
            'option_b'       => $q['option_b'],
            'option_c'       => $q['option_c'],
            'option_d'       => $q['option_d'],
            'correct_option' => $q['correct_option'],
        ], $rows);
    }

    public function questionCreate(Request $req, array $p, array $user): array
    {
        $t = GuruContext::teacher($user);
        $assessmentId = (int) $p['id'];
        $this->ownAssessment($assessmentId, $t['id']);
        $this->assertNoAttempts($assessmentId);
        $q = $this->questionInput($req->input());
        $pos = (int) Db::value('SELECT COALESCE(MAX(position),0) + 1 FROM assessment_questions WHERE assessment_id = ?', [$assessmentId]);
        $id = Db::insert(
            'INSERT INTO assessment_questions (assessment_id, question, option_a, option_b, option_c, option_d, correct_option, position)
             VALUES (?,?,?,?,?,?,?,?)',
            [$assessmentId, $q['question'], $q['option_a'], $q['option_b'], $q['option_c'], $q['option_d'], $q['correct_option'], $pos]
        );
        return ['id' => $id] + $q;
    }

    public function questionUpdate(Request $req, array $p, array $user): array
    {
        $t = GuruContext::teacher($user);
        $row = $this->ownQuestion((int) $p['id'], $t['id']);
        $this->assertNoAttempts((int) $row['assessment_id']);
        $q = $this->questionInput($req->input());
        Db::exec(
            'UPDATE assessment_questions SET question=?, option_a=?, option_b=?, option_c=?, option_d=?, correct_option=? WHERE id=?',
            [$q['question'], $q['option_a'], $q['option_b'], $q['option_c'], $q['option_d'], $q['correct_option'], (int) $p['id']]
        );
        return ['id' => (int) $p['id']] + $q;
    }

    public function questionDelete(Request $req, array $p, array $user): array
    {
        $t = GuruContext::teacher($user);
        $row = $this->ownQuestion((int) $p['id'], $t['id']);
        $this->assertNoAttempts((int) $row['assessment_id']);
        $remaining = (int) Db::value('SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = ?', [(int) $row['assessment_id']]);
        if ($remaining <= 1 && $row['status'] === 'Aktif') {
            throw new ApiException(409, 'Asesmen yang aktif harus memiliki minimal 1 soal. Ubah status ke Draft terlebih dahulu.');
        }
        Db::exec('DELETE FROM assessment_questions WHERE id = ?', [(int) $p['id']]);
        return ['deleted' => true];
    }

    public function assessmentResults(Request $req, array $p, array $user): array
    {
        $t = GuruContext::teacher($user);
        $a = $this->ownAssessment((int) $p['id'], $t['id']);
        $rows = Db::all(
            'SELECT st.id AS student_id, u.name, st.nis, x.submitted_at, x.score
             FROM students st
             JOIN users u ON u.id = st.user_id
             LEFT JOIN assessment_attempts x ON x.student_id = st.id AND x.assessment_id = ?
             WHERE st.class_id = ?
             ORDER BY u.name',
            [(int) $a['id'], (int) $a['class_id']]
        );
        return array_map(static fn(array $r): array => [
            'student_id'   => (int) $r['student_id'],
            'name'         => $r['name'],
            'nis'          => $r['nis'],
            'submitted_at' => $r['submitted_at'],
            'score'        => $r['submitted_at'] === null ? null : Num::f($r['score'], 1),
        ], $rows);
    }

    private function ownAssessment(int $id, int $teacherId): array
    {
        $a = Db::one('SELECT * FROM assessments WHERE id = ? AND teacher_id = ?', [$id, $teacherId]);
        if (!$a) {
            throw new ApiException(404, 'Asesmen tidak ditemukan.');
        }
        return $a;
    }

    private function ownQuestion(int $id, int $teacherId): array
    {
        $q = Db::one(
            'SELECT q.id, q.assessment_id, a.status FROM assessment_questions q
             JOIN assessments a ON a.id = q.assessment_id
             WHERE q.id = ? AND a.teacher_id = ?',
            [$id, $teacherId]
        );
        if (!$q) {
            throw new ApiException(404, 'Soal tidak ditemukan.');
        }
        return $q;
    }

    private function assertNoAttempts(int $assessmentId): void
    {
        if ((int) Db::value('SELECT COUNT(*) FROM assessment_attempts WHERE assessment_id = ?', [$assessmentId]) > 0) {
            throw new ApiException(409, 'Soal tidak dapat diubah karena sudah ada siswa yang mengerjakan asesmen ini.');
        }
    }

    private function questionInput(array $d): array
    {
        $e = [];
        $out = [
            'question'       => Input::str($d, 'question', 'Pertanyaan', $e, true, 2000),
            'option_a'       => Input::str($d, 'option_a', 'Pilihan A', $e, true, 300),
            'option_b'       => Input::str($d, 'option_b', 'Pilihan B', $e, true, 300),
            'option_c'       => Input::str($d, 'option_c', 'Pilihan C', $e, true, 300),
            'option_d'       => Input::str($d, 'option_d', 'Pilihan D', $e, true, 300),
            'correct_option' => Input::enum($d, 'correct_option', 'Kunci jawaban', ['A', 'B', 'C', 'D'], $e),
        ];
        Input::assertValid($e);
        return $out;
    }

    // =========================================================== tugas
    private function assignmentRows(int $teacherId, ?int $onlyId = null): array
    {
        $sql = 'SELECT a.id, a.title, a.description, a.type, a.deadline, a.class_id, c.name AS class_name, sb.name AS subject,
                       (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) AS submitted,
                       (SELECT COUNT(*) FROM students st WHERE st.class_id = a.class_id) AS total
                FROM assignments a
                JOIN classes c ON c.id = a.class_id
                JOIN subjects sb ON sb.id = a.subject_id
                WHERE a.teacher_id = ?';
        $params = [$teacherId];
        if ($onlyId !== null) {
            $sql .= ' AND a.id = ?';
            $params[] = $onlyId;
        }
        $rows = Db::all($sql . ' ORDER BY a.deadline DESC, a.id DESC', $params);
        return array_map(static fn(array $r): array => [
            'id'          => (int) $r['id'],
            'title'       => $r['title'],
            'description' => $r['description'],
            'type'        => $r['type'],
            'deadline'    => $r['deadline'],
            'class_id'    => (int) $r['class_id'],
            'class'       => $r['class_name'],
            'subject'     => $r['subject'],
            'submitted'   => (int) $r['submitted'],
            'total'       => (int) $r['total'],
        ], $rows);
    }

    public function assignments(Request $req, array $p, array $user): array
    {
        return $this->assignmentRows(GuruContext::teacher($user)['id']);
    }

    public function assignmentSave(Request $req, array $p, array $user): array
    {
        $t = GuruContext::teacher($user);
        $id = isset($p['id']) ? (int) $p['id'] : null;
        $existing = null;
        if ($id !== null) {
            $existing = Db::one('SELECT * FROM assignments WHERE id = ? AND teacher_id = ?', [$id, $t['id']]);
            if (!$existing) {
                throw new ApiException(404, 'Tugas tidak ditemukan.');
            }
        }
        $d = $req->input();
        $e = [];
        $title = Input::str($d, 'title', 'Judul tugas', $e, true, 200);
        $desc = Input::str($d, 'description', 'Deskripsi', $e, false, 5000);
        $type = Input::enum($d, 'type', 'Tipe', ['Tugas', 'Proyek', 'Praktikum'], $e);
        $classId = Input::int($d, 'class_id', 'Kelas', $e, true, 1);
        $deadline = Input::date($d, 'deadline', 'Deadline', $e);
        Input::assertValid($e);
        GuruContext::assertCanTeach($t, (int) $classId);

        if ($existing && (int) $existing['class_id'] !== $classId
            && (int) Db::value('SELECT COUNT(*) FROM submissions WHERE assignment_id = ?', [$id]) > 0) {
            throw new ApiException(409, 'Kelas tidak dapat diubah karena sudah ada pengumpulan tugas.');
        }

        if ($existing) {
            Db::exec(
                'UPDATE assignments SET title=?, description=?, type=?, class_id=?, subject_id=?, deadline=? WHERE id=?',
                [$title, $desc, $type, $classId, $t['subject_id'], $deadline, $id]
            );
        } else {
            $id = Db::insert(
                'INSERT INTO assignments (teacher_id, class_id, subject_id, title, description, type, deadline) VALUES (?,?,?,?,?,?,?)',
                [$t['id'], $classId, $t['subject_id'], $title, $desc, $type, $deadline]
            );
        }
        return $this->assignmentRows($t['id'], (int) $id)[0];
    }

    public function assignmentDelete(Request $req, array $p, array $user): array
    {
        $t = GuruContext::teacher($user);
        $id = (int) $p['id'];
        if (!Db::one('SELECT id FROM assignments WHERE id = ? AND teacher_id = ?', [$id, $t['id']])) {
            throw new ApiException(404, 'Tugas tidak ditemukan.');
        }
        $files = Db::all('SELECT file_path FROM submissions WHERE assignment_id = ? AND file_path IS NOT NULL', [$id]);
        Db::exec('DELETE FROM assignments WHERE id = ?', [$id]);
        foreach ($files as $f) {
            Upload::delete($f['file_path']);
        }
        return ['deleted' => true];
    }

    public function submissions(Request $req, array $p, array $user): array
    {
        $t = GuruContext::teacher($user);
        $a = Db::one('SELECT id, class_id FROM assignments WHERE id = ? AND teacher_id = ?', [(int) $p['id'], $t['id']]);
        if (!$a) {
            throw new ApiException(404, 'Tugas tidak ditemukan.');
        }
        $rows = Db::all(
            'SELECT st.id AS student_id, u.name, st.nis, s.id AS submission_id, s.submitted_at, s.note, s.file_name, s.score, s.feedback
             FROM students st
             JOIN users u ON u.id = st.user_id
             LEFT JOIN submissions s ON s.student_id = st.id AND s.assignment_id = ?
             WHERE st.class_id = ?
             ORDER BY u.name',
            [(int) $a['id'], (int) $a['class_id']]
        );
        return array_map(static fn(array $r): array => [
            'student_id'    => (int) $r['student_id'],
            'name'          => $r['name'],
            'nis'           => $r['nis'],
            'submission_id' => $r['submission_id'] === null ? null : (int) $r['submission_id'],
            'submitted_at'  => $r['submitted_at'],
            'note'          => $r['note'],
            'file_name'     => $r['file_name'],
            'has_file'      => $r['file_name'] !== null,
            'score'         => Num::f($r['score'], 1),
            'feedback'      => $r['feedback'],
        ], $rows);
    }

    public function submissionGrade(Request $req, array $p, array $user): array
    {
        $t = GuruContext::teacher($user);
        $s = Db::one(
            'SELECT s.id FROM submissions s JOIN assignments a ON a.id = s.assignment_id
             WHERE s.id = ? AND a.teacher_id = ?',
            [(int) $p['id'], $t['id']]
        );
        if (!$s) {
            throw new ApiException(404, 'Pengumpulan tidak ditemukan.');
        }
        $d = $req->input();
        $e = [];
        $raw = $d['score'] ?? null;
        if ($raw === null || $raw === '' || !is_numeric($raw) || (float) $raw < 0 || (float) $raw > 100) {
            $e['score'] = 'Nilai harus berupa angka 0 - 100.';
        }
        $feedback = Input::str($d, 'feedback', 'Catatan', $e, false, 2000);
        Input::assertValid($e);
        Db::exec(
            'UPDATE submissions SET score = ?, feedback = ?, graded_at = NOW() WHERE id = ?',
            [round((float) $raw, 2), $feedback, (int) $p['id']]
        );
        return ['id' => (int) $p['id'], 'score' => round((float) $raw, 1), 'feedback' => $feedback];
    }

    // =========================================================== nilai
    public function grades(Request $req, array $p, array $user): array
    {
        $t = GuruContext::teacher($user);
        $e = [];
        $classId = Input::int($req->query, 'class_id', 'Kelas', $e, true, 1);
        Input::assertValid($e);
        GuruContext::assertCanTeach($t, (int) $classId);

        $class = Db::one('SELECT name FROM classes WHERE id = ?', [$classId]);
        $subject = Db::value('SELECT name FROM subjects WHERE id = ?', [$t['subject_id']]);
        $students = Db::all(
            'SELECT st.id, st.nis, u.name FROM students st JOIN users u ON u.id = st.user_id WHERE st.class_id = ? ORDER BY u.name',
            [$classId]
        );

        $tugas = [];
        foreach (Db::all(
            'SELECT s.student_id, AVG(s.score) AS avg_score
             FROM submissions s JOIN assignments a ON a.id = s.assignment_id
             WHERE a.teacher_id = ? AND a.class_id = ? AND s.score IS NOT NULL
             GROUP BY s.student_id',
            [$t['id'], $classId]
        ) as $r) {
            $tugas[(int) $r['student_id']] = (float) $r['avg_score'];
        }

        // Rata-rata per komponen dihitung dari SUM/COUNT agar gabungan Kuis + Ulangan Harian tetap akurat.
        $acc = [];
        foreach (Db::all(
            'SELECT x.student_id, a.type, SUM(x.score) AS total, COUNT(*) AS n
             FROM assessment_attempts x JOIN assessments a ON a.id = x.assessment_id
             WHERE a.teacher_id = ? AND a.class_id = ? AND x.submitted_at IS NOT NULL
             GROUP BY x.student_id, a.type',
            [$t['id'], $classId]
        ) as $r) {
            $g = Grading::group($r['type']);
            $sid = (int) $r['student_id'];
            $acc[$sid][$g]['sum'] = ($acc[$sid][$g]['sum'] ?? 0.0) + (float) $r['total'];
            $acc[$sid][$g]['n'] = ($acc[$sid][$g]['n'] ?? 0) + (int) $r['n'];
        }
        $avgOf = static fn(int $sid, string $g): ?float =>
            isset($acc[$sid][$g]) ? $acc[$sid][$g]['sum'] / $acc[$sid][$g]['n'] : null;

        $rows = [];
        foreach ($students as $s) {
            $sid = (int) $s['id'];
            $tg = $tugas[$sid] ?? null;
            $uh = $avgOf($sid, 'uh');
            $uts = $avgOf($sid, 'uts');
            $uas = $avgOf($sid, 'uas');
            $final = Grading::finalScore($tg, $uh, $uts, $uas);
            $rows[] = [
                'student_id' => $sid,
                'student'    => $s['name'],
                'nis'        => $s['nis'],
                'tugas'      => Num::f($tg),
                'uh'         => Num::f($uh),
                'uts'        => Num::f($uts),
                'uas'        => Num::f($uas),
                'final'      => $final,
                'predikat'   => Grading::predikat($final),
            ];
        }

        $finals = array_values(array_filter(array_column($rows, 'final'), static fn($v) => $v !== null));
        $best = null;
        foreach ($rows as $r) {
            if ($r['final'] !== null && ($best === null || $r['final'] > $best['final'])) {
                $best = $r;
            }
        }
        $kkm = Grading::kkm();
        return [
            'class'   => $class['name'] ?? '',
            'subject' => $subject,
            'kkm'     => $kkm,
            'summary' => [
                'average'      => $finals ? round(array_sum($finals) / count($finals), 1) : null,
                'highest'      => $best ? $best['final'] : null,
                'highest_name' => $best ? $best['student'] : null,
                'pass_percent' => $finals ? (int) round(100 * count(array_filter($finals, static fn($v) => $v >= $kkm)) / count($finals)) : null,
            ],
            'rows'    => $rows,
        ];
    }
}
