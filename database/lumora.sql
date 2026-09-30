-- =====================================================================
--  Lumora E-Learning - database schema + data contoh
--  Import lewat HeidiSQL / phpMyAdmin (Laragon) - lihat README.md
--  PERHATIAN: file ini MENGHAPUS tabel lama lalu membuat ulang (reset data).
-- =====================================================================
SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS `lumora_elearning` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `lumora_elearning`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS submissions, assignments, attempt_answers, assessment_attempts, assessment_questions,
    assessments, materials, students, teacher_classes, classes, teachers, subjects, majors, users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin','guru','siswa','kurikulum','kepsek') NOT NULL,
  status        ENUM('Aktif','Nonaktif') NOT NULL DEFAULT 'Aktif',
  last_login    DATETIME NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE majors (
  id   INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20)  NOT NULL,
  name VARCHAR(150) NOT NULL,
  UNIQUE KEY uq_majors_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE subjects (
  id   INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  UNIQUE KEY uq_subjects_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE teachers (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  nip        VARCHAR(30)  NULL,
  subject_id INT UNSIGNED NULL,
  UNIQUE KEY uq_teachers_user (user_id),
  UNIQUE KEY uq_teachers_nip (nip),
  CONSTRAINT fk_teachers_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_teachers_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE classes (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(60) NOT NULL,
  major_id        INT UNSIGNED NOT NULL,
  wali_teacher_id INT UNSIGNED NULL,
  academic_year   VARCHAR(9)  NOT NULL,
  UNIQUE KEY uq_classes_name (name),
  CONSTRAINT fk_classes_major FOREIGN KEY (major_id)        REFERENCES majors(id)   ON DELETE RESTRICT,
  CONSTRAINT fk_classes_wali  FOREIGN KEY (wali_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE teacher_classes (
  teacher_id INT UNSIGNED NOT NULL,
  class_id   INT UNSIGNED NOT NULL,
  PRIMARY KEY (teacher_id, class_id),
  CONSTRAINT fk_tc_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  CONSTRAINT fk_tc_class   FOREIGN KEY (class_id)   REFERENCES classes(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE students (
  id       INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id  INT UNSIGNED NOT NULL,
  nis      VARCHAR(20)  NULL,
  class_id INT UNSIGNED NULL,
  UNIQUE KEY uq_students_user (user_id),
  UNIQUE KEY uq_students_nis (nis),
  KEY idx_students_class (class_id),
  CONSTRAINT fk_students_user  FOREIGN KEY (user_id)  REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_students_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE materials (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  teacher_id   INT UNSIGNED NOT NULL,
  class_id     INT UNSIGNED NOT NULL,
  subject_id   INT UNSIGNED NOT NULL,
  title        VARCHAR(200) NOT NULL,
  type         ENUM('PDF','Video','Presentasi') NOT NULL,
  file_path    VARCHAR(255) NULL,
  file_name    VARCHAR(255) NULL,
  file_size    BIGINT UNSIGNED NULL,
  external_url VARCHAR(500) NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_materials_class (class_id),
  KEY idx_materials_teacher (teacher_id),
  CONSTRAINT fk_materials_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  CONSTRAINT fk_materials_class   FOREIGN KEY (class_id)   REFERENCES classes(id)  ON DELETE CASCADE,
  CONSTRAINT fk_materials_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE assessments (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  teacher_id       INT UNSIGNED NOT NULL,
  class_id         INT UNSIGNED NOT NULL,
  subject_id       INT UNSIGNED NOT NULL,
  title            VARCHAR(200) NOT NULL,
  type             ENUM('Kuis','Ulangan Harian','Ujian Tengah Semester','Ujian Akhir Semester') NOT NULL,
  start_date       DATE NOT NULL,
  due_date         DATE NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  status           ENUM('Draft','Aktif') NOT NULL DEFAULT 'Draft',
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_assessments_class (class_id),
  KEY idx_assessments_teacher (teacher_id),
  CONSTRAINT fk_assessments_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  CONSTRAINT fk_assessments_class   FOREIGN KEY (class_id)   REFERENCES classes(id)  ON DELETE CASCADE,
  CONSTRAINT fk_assessments_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE assessment_questions (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT UNSIGNED NOT NULL,
  question      TEXT NOT NULL,
  option_a      VARCHAR(300) NOT NULL,
  option_b      VARCHAR(300) NOT NULL,
  option_c      VARCHAR(300) NOT NULL,
  option_d      VARCHAR(300) NOT NULL,
  correct_option CHAR(1) NOT NULL,
  position      INT UNSIGNED NOT NULL DEFAULT 1,
  KEY idx_questions_assessment (assessment_id),
  CONSTRAINT fk_questions_assessment FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE assessment_attempts (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT UNSIGNED NOT NULL,
  student_id    INT UNSIGNED NOT NULL,
  started_at    DATETIME NOT NULL,
  submitted_at  DATETIME NULL,
  score         DECIMAL(5,2) NULL,
  UNIQUE KEY uq_attempt (assessment_id, student_id),
  KEY idx_attempt_student (student_id),
  CONSTRAINT fk_attempts_assessment FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  CONSTRAINT fk_attempts_student    FOREIGN KEY (student_id)    REFERENCES students(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE attempt_answers (
  attempt_id    INT UNSIGNED NOT NULL,
  question_id   INT UNSIGNED NOT NULL,
  chosen_option CHAR(1) NULL,
  PRIMARY KEY (attempt_id, question_id),
  CONSTRAINT fk_answers_attempt  FOREIGN KEY (attempt_id)  REFERENCES assessment_attempts(id)  ON DELETE CASCADE,
  CONSTRAINT fk_answers_question FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE assignments (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  teacher_id  INT UNSIGNED NOT NULL,
  class_id    INT UNSIGNED NOT NULL,
  subject_id  INT UNSIGNED NOT NULL,
  title       VARCHAR(200) NOT NULL,
  description TEXT NULL,
  type        ENUM('Tugas','Proyek','Praktikum') NOT NULL DEFAULT 'Tugas',
  deadline    DATE NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_assignments_class (class_id),
  KEY idx_assignments_teacher (teacher_id),
  CONSTRAINT fk_assignments_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  CONSTRAINT fk_assignments_class   FOREIGN KEY (class_id)   REFERENCES classes(id)  ON DELETE CASCADE,
  CONSTRAINT fk_assignments_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE submissions (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT UNSIGNED NOT NULL,
  student_id    INT UNSIGNED NOT NULL,
  note          TEXT NULL,
  file_path     VARCHAR(255) NULL,
  file_name     VARCHAR(255) NULL,
  submitted_at  DATETIME NOT NULL,
  score         DECIMAL(5,2) NULL,
  feedback      TEXT NULL,
  graded_at     DATETIME NULL,
  UNIQUE KEY uq_submission (assignment_id, student_id),
  KEY idx_submission_student (student_id),
  CONSTRAINT fk_submissions_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  CONSTRAINT fk_submissions_student    FOREIGN KEY (student_id)    REFERENCES students(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  DATA CONTOH (password di bawah ini hanya untuk demo - ganti sebelum dipakai sungguhan)
--    admin@lumora.sch.id / admin123      kepsek@lumora.sch.id / kepsek123
--    kurikulum@lumora.sch.id / kuri123   *guru@lumora.sch.id (budi, siti, ahmad, dewi, rizky) / guru123
--    *siswa@lumora.sch.id (andi, bunga, cahyo, dina, erik, fitri, galih, hani, indra, jihan) / siswa123
-- =====================================================================

INSERT INTO users (id, name, email, password_hash, role) VALUES
(1, 'Super Admin', 'admin@lumora.sch.id', '$2y$10$me11ynebY/uHG/eSjo/cj.OaRnzdCKUcniW2i2Div7/rDGwD78uNO', 'admin'),
(2, 'Dr. H. Sugiyono, M.Pd.', 'kepsek@lumora.sch.id', '$2y$10$CHoNEagkScpDWwfT/OJJAO.Moc2UOk22UGMg1jmCCrMdsWaULHTRK', 'kepsek'),
(3, 'Ir. Hendra Wibowo', 'kurikulum@lumora.sch.id', '$2y$10$6NoJx4NO5pJpNycjYpDjme2KDgBJS8xOKzXeK95UdF3WO3IFzb9ni', 'kurikulum'),
(4, 'Budi Santoso, S.Pd.', 'budi@lumora.sch.id', '$2y$10$krZcVvUCXUBiTXPFWacL4edr4DKLcJVPcO8jhDeYNYySx6NU8Apsy', 'guru'),
(5, 'Siti Rahayu, S.Kom.', 'siti@lumora.sch.id', '$2y$10$WHyBZ6eMjnrVZQH3vMdp9uXDYGxiQe74UOaAPFtPT6DYPa6cWXsoG', 'guru'),
(6, 'Ahmad Fauzi, M.Pd.', 'ahmad@lumora.sch.id', '$2y$10$5VPkI2hy2qE8y1oCLKaD9O7yEzjMJDKXZm56yVFt.IeD3a3eXfeVK', 'guru'),
(7, 'Dewi Lestari, S.Pd.', 'dewi@lumora.sch.id', '$2y$10$2lfbD2CK3.PcLR.Q2hIyZ.sTAU/R//xu2Tr3gxH6haCF8kfXeUZDe', 'guru'),
(8, 'Rizky Pratama, S.T.', 'rizky@lumora.sch.id', '$2y$10$SgqeQNnjIMRfKV9YW9ym7Op7ekIpmId5HKkR6NdJveSvkFLx7C2J2', 'guru'),
(9, 'Andi Saputra', 'andi@lumora.sch.id', '$2y$10$5sDrpWTryTrdxPg0LslInuqyPlFLvkMcSygluz.BlPuEu.uhDVLj6', 'siswa'),
(10, 'Bunga Maharani', 'bunga@lumora.sch.id', '$2y$10$xaojVeoTeoD/3JiQ.xwF6uDRAza1UdjzcWCHEW/fpXMNVEw7hDqj2', 'siswa'),
(11, 'Cahyo Nugroho', 'cahyo@lumora.sch.id', '$2y$10$W8Lall0VloEYxegRAutTGuKqMFx1ydXDVzFl8FF6ttcqx/qpKp0v6', 'siswa'),
(12, 'Dina Pertiwi', 'dina@lumora.sch.id', '$2y$10$Ou6AEHN34cVcGRZb5Z0ovOCVa4VnMhOdo435YgHUPihwqdnZXolWy', 'siswa'),
(13, 'Erik Kusuma', 'erik@lumora.sch.id', '$2y$10$7dY3CecXAO2hUH.Rd9LUjeE3JgrBLjQDbwj01s89QFoPDIS1sC/1O', 'siswa'),
(14, 'Fitri Handayani', 'fitri@lumora.sch.id', '$2y$10$63TZUO9iZL3XIWSEfDr01.UBYNY9AUhhSejKvIg0HX./aVvuWGBF.', 'siswa'),
(15, 'Galih Wicaksono', 'galih@lumora.sch.id', '$2y$10$iQKBmzlUUN9xlljvguyV3uPRvMElPfhmjUPOJsv.5ENw9279UP3oe', 'siswa'),
(16, 'Hani Sukmawati', 'hani@lumora.sch.id', '$2y$10$zM92P55iG5Ew15a3KEBUtO7voE1k/hR369fyj023YUNEqxcXGA8h.', 'siswa'),
(17, 'Indra Permana', 'indra@lumora.sch.id', '$2y$10$gps6U/GnXz/LlWA90A.bvOI9BH4Fa/0KNSbWjW5QYqONo///QSjs.', 'siswa'),
(18, 'Jihan Aulia', 'jihan@lumora.sch.id', '$2y$10$0WgH0bgqQ7z4YEQe.cgTR.AavMNZuvEWpsB9f/iSpiP5SgwcaVj1i', 'siswa');

INSERT INTO majors (id, code, name) VALUES
(1, 'PPLG', 'Pengembangan Perangkat Lunak dan Gim'),
(2, 'DKV', 'Desain Komunikasi Visual'),
(3, 'TKJT', 'Teknik Jaringan Komputer dan Telekomunikasi'),
(4, 'BDP', 'Bisnis Daring dan Pemasaran'),
(5, 'MPLB', 'Manajemen Perkantoran dan Layanan Bisnis'),
(6, 'PHT', 'Perhotelan');

INSERT INTO subjects (id, name) VALUES
(1, 'Matematika'),
(2, 'Pemrograman Web'),
(3, 'Bahasa Indonesia'),
(4, 'Fisika'),
(5, 'Jaringan Komputer');

INSERT INTO teachers (id, user_id, nip, subject_id) VALUES
(1, 4, '198501012010011001', 1),
(2, 5, '198703052012012002', 2),
(3, 6, '197912202008011003', 3),
(4, 7, '199002182015012004', 4),
(5, 8, '199208302018011005', 5);

INSERT INTO classes (id, name, major_id, wali_teacher_id, academic_year) VALUES
(1, 'X PPLG 1', 1, 2, '2026/2027'),
(2, 'X DKV 1', 2, 4, '2026/2027'),
(3, 'X MPLB 1', 5, 3, '2026/2027'),
(4, 'X TKJT 1', 3, 5, '2026/2027'),
(5, 'XI DKV 1', 2, 3, '2026/2027'),
(6, 'XI TKJT 1', 3, 5, '2026/2027'),
(7, 'XI BDP 2', 4, 1, '2026/2027'),
(8, 'XI PHT 1', 6, 3, '2026/2027'),
(9, 'XII MPLB 1', 5, 1, '2026/2027');

INSERT INTO teacher_classes (teacher_id, class_id) VALUES
(1, 1),
(1, 2),
(1, 3),
(1, 4),
(1, 5),
(1, 6),
(1, 7),
(1, 8),
(1, 9),
(2, 1),
(2, 4),
(3, 5),
(3, 7),
(3, 8),
(3, 9),
(4, 1),
(4, 4),
(4, 6),
(5, 4),
(5, 6);

INSERT INTO students (id, user_id, nis, class_id) VALUES
(1, 9, '2024001', 1),
(2, 10, '2024002', 5),
(3, 11, '2024003', 4),
(4, 12, '2024004', 7),
(5, 13, '2024005', 9),
(6, 14, '2024006', 8),
(7, 15, '2024007', 1),
(8, 16, '2024008', 6),
(9, 17, '2024009', 1),
(10, 18, '2024010', 1);

INSERT INTO materials (id, teacher_id, class_id, subject_id, title, type, file_path, file_name, file_size, external_url, created_at) VALUES
(1, 2, 1, 2, 'Pengantar Algoritma dan Pemrograman', 'PDF', 'materials/seed-algoritma.pdf', 'Pengantar Algoritma dan Pemrograman.pdf', 955, NULL, DATE_ADD(NOW(), INTERVAL -30 DAY)),
(2, 2, 1, 2, 'Dasar HTML & CSS', 'PDF', 'materials/seed-html-css.pdf', 'Dasar HTML & CSS.pdf', 933, NULL, DATE_ADD(NOW(), INTERVAL -25 DAY)),
(3, 2, 1, 2, 'Pengantar JavaScript (Video)', 'Video', NULL, NULL, NULL, 'https://www.youtube.com/watch?v=PkZNo7MFNFg', DATE_ADD(NOW(), INTERVAL -20 DAY)),
(4, 5, 4, 5, 'Konsep Jaringan LAN', 'PDF', 'materials/seed-lan.pdf', 'Konsep Jaringan LAN.pdf', 919, NULL, DATE_ADD(NOW(), INTERVAL -15 DAY)),
(5, 1, 1, 1, 'Barisan dan Deret', 'PDF', 'materials/seed-barisan-deret.pdf', 'Barisan dan Deret.pdf', 857, NULL, DATE_ADD(NOW(), INTERVAL -10 DAY));

INSERT INTO assessments (id, teacher_id, class_id, subject_id, title, type, start_date, due_date, duration_minutes, status) VALUES
(1, 2, 1, 2, 'UH 1 - Algoritma Dasar', 'Ulangan Harian', DATE_ADD(CURDATE(), INTERVAL -3 DAY), DATE_ADD(CURDATE(), INTERVAL 14 DAY), 30, 'Aktif'),
(2, 2, 1, 2, 'Kuis JavaScript Dasar', 'Kuis', DATE_ADD(CURDATE(), INTERVAL -20 DAY), DATE_ADD(CURDATE(), INTERVAL -10 DAY), 15, 'Aktif'),
(3, 2, 1, 2, 'UTS Semester 1', 'Ujian Tengah Semester', DATE_ADD(CURDATE(), INTERVAL 20 DAY), DATE_ADD(CURDATE(), INTERVAL 25 DAY), 90, 'Draft'),
(4, 5, 4, 5, 'Kuis Konsep Jaringan', 'Kuis', DATE_ADD(CURDATE(), INTERVAL -2 DAY), DATE_ADD(CURDATE(), INTERVAL 10 DAY), 20, 'Aktif'),
(5, 1, 1, 1, 'UH 1 - Barisan dan Deret', 'Ulangan Harian', DATE_ADD(CURDATE(), INTERVAL 3 DAY), DATE_ADD(CURDATE(), INTERVAL 10 DAY), 45, 'Aktif');

INSERT INTO assessment_questions (assessment_id, question, option_a, option_b, option_c, option_d, correct_option, position) VALUES
(1, 'Apa yang dimaksud dengan algoritma?', 'Bahasa pemrograman tingkat tinggi', 'Urutan langkah logis untuk menyelesaikan masalah', 'Perangkat keras komputer', 'Aplikasi pengolah kata', 'B', 1),
(1, 'Simbol flowchart berbentuk belah ketupat digunakan untuk...', 'Proses', 'Awal/akhir program', 'Percabangan/keputusan', 'Input/output', 'C', 2),
(1, 'Struktur kontrol yang mengulang perintah selama kondisi terpenuhi disebut...', 'Sequence', 'Selection', 'Iteration (perulangan)', 'Declaration', 'C', 3),
(1, 'Hasil dari 7 % 3 pada sebagian besar bahasa pemrograman adalah...', '1', '2', '3', '0', 'A', 4),
(1, 'Variabel dalam pemrograman berfungsi untuk...', 'Menyimpan data sementara di memori', 'Mencetak dokumen', 'Menghubungkan jaringan', 'Menggambar antarmuka', 'A', 5),
(2, 'Kata kunci untuk mendeklarasikan variabel yang nilainya dapat berubah adalah...', 'const', 'let', 'static', 'final', 'B', 1),
(2, 'Method untuk menampilkan pesan di console browser adalah...', 'console.log()', 'print()', 'echo()', 'write.console()', 'A', 2),
(2, 'Hasil dari "5" + 3 di JavaScript adalah...', '8', '"53"', 'NaN', 'Error', 'B', 3),
(2, 'Operator untuk membandingkan nilai sekaligus tipe data adalah...', '=', '==', '===', '=>', 'C', 4),
(3, 'Tag HTML untuk membuat tautan adalah...', '<link>', '<a>', '<href>', '<url>', 'B', 1),
(3, 'Properti CSS untuk mengubah warna teks adalah...', 'font-color', 'text-color', 'color', 'foreground', 'C', 2),
(4, 'LAN adalah singkatan dari...', 'Local Area Network', 'Large Area Network', 'Long Access Node', 'Linked Area Network', 'A', 1),
(4, 'Perangkat yang menghubungkan beberapa komputer dalam satu jaringan lokal adalah...', 'Switch', 'Printer', 'Scanner', 'Monitor', 'A', 2),
(4, 'Alamat IP 192.168.1.10 termasuk kelas...', 'A', 'B', 'C', 'D', 'C', 3),
(5, 'Suku ke-10 barisan aritmetika 2, 5, 8, ... adalah...', '26', '29', '32', '35', 'B', 1),
(5, 'Rumus suku ke-n barisan geometri adalah...', 'a + (n-1)b', 'a . r^(n-1)', 'n/2 (a + Un)', 'a . n', 'B', 2),
(5, 'Jumlah 5 suku pertama deret aritmetika 3, 7, 11, ... adalah...', '45', '55', '60', '75', 'B', 3);

INSERT INTO assessment_attempts (assessment_id, student_id, started_at, submitted_at, score) VALUES
(1, 7, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 12 MINUTE), 80),
(1, 9, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 12 MINUTE), 60),
(2, 1, DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 12 DAY), INTERVAL 12 MINUTE), 75),
(2, 7, DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 12 DAY), INTERVAL 12 MINUTE), 100),
(2, 9, DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 12 DAY), INTERVAL 12 MINUTE), 50),
(2, 10, DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 12 DAY), INTERVAL 12 MINUTE), 75);

INSERT INTO assignments (id, teacher_id, class_id, subject_id, title, description, type, deadline) VALUES
(1, 2, 1, 2, 'Tugas 1: Membuat Algoritma Pengurutan', 'Buat flowchart dan pseudocode algoritma pengurutan (bubble sort). Kumpulkan dalam bentuk file PDF atau tulis langkah-langkahnya pada kolom jawaban.', 'Tugas', DATE_ADD(CURDATE(), INTERVAL 5 DAY)),
(2, 2, 1, 2, 'Proyek Web Portofolio', 'Bangun website portofolio pribadi (minimal 3 halaman) menggunakan HTML & CSS. Unggah dalam bentuk file ZIP.', 'Proyek', DATE_ADD(CURDATE(), INTERVAL 21 DAY)),
(3, 5, 4, 5, 'Laporan Konfigurasi Jaringan', 'Susun laporan konfigurasi jaringan LAN sederhana (topologi, pengalamatan IP, dan hasil uji ping).', 'Tugas', DATE_ADD(CURDATE(), INTERVAL 7 DAY)),
(4, 2, 1, 2, 'Tugas 0: Perkenalan Diri (HTML)', 'Buat halaman HTML perkenalan diri menggunakan tag heading, paragraf, dan daftar.', 'Tugas', DATE_ADD(CURDATE(), INTERVAL -5 DAY));

INSERT INTO submissions (assignment_id, student_id, note, submitted_at, score, feedback, graded_at) VALUES
(1, 7, 'Saya membuat bubble sort dengan flowchart dan pseudocode. Detail terlampir pada jawaban ini.', DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, NULL, NULL),
(4, 7, 'Halaman perkenalan diri sudah selesai.', DATE_SUB(NOW(), INTERVAL 1 DAY), 90, 'Struktur HTML rapi, tambahkan lebih banyak variasi tag.', NOW()),
(4, 9, 'Sudah saya buat sesuai instruksi.', DATE_SUB(NOW(), INTERVAL 1 DAY), 80, 'Bagus, perhatikan penutupan tag.', NOW()),
(4, 10, 'Perkenalan diri lengkap dengan daftar hobi.', DATE_SUB(NOW(), INTERVAL 1 DAY), 85, 'Baik sekali.', NOW()),
(3, 3, 'Laporan konfigurasi LAN: topologi star, IP 192.168.10.0/24, hasil ping berhasil.', DATE_SUB(NOW(), INTERVAL 1 DAY), 88, 'Laporan jelas dan lengkap.', NOW());
