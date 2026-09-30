export type Role = "admin" | "guru" | "siswa" | "kurikulum" | "kepsek";

export interface Account { id: number; name: string; email: string; role: Role; status: string; last_login: string | null }

export interface ClassRow {
  id: number; name: string; major_id: number | null; major: string | null;
  wali_teacher_id: number | null; wali: string | null; students: number; year: string;
}

export interface Teacher {
  id: number; user_id: number; name: string; nip: string | null; email: string; status: string;
  subject_id: number | null; subject: string | null;
  classes: { id: number; name: string }[]; class_ids: number[]; class_names: string;
}

export interface Student {
  id: number; user_id: number; name: string; email: string; nis: string | null;
  class_id: number | null; class: string | null; major: string | null; major_code: string | null; status: string;
}

export interface Meta {
  majors: { id: number; code: string; name: string }[];
  subjects: { id: number; name: string }[];
  classes: ClassRow[];
  teachers?: { id: number; name: string }[];
}

export interface Material {
  id: number; title: string; type: "PDF" | "Video" | "Presentasi"; class_id: number; class: string; subject: string;
  teacher?: string | null; file_name: string | null; size: number | null; has_file: boolean;
  external_url: string | null; uploaded: string;
}

export interface Assessment {
  id: number; title: string; type: string; class_id: number; class: string; subject: string;
  start_date: string; due_date: string; duration_minutes: number; status: "Draft" | "Aktif";
  questions: number; attempts: number;
}

export interface Question {
  id: number; question: string; option_a: string; option_b: string; option_c: string; option_d: string;
  correct_option: "A" | "B" | "C" | "D";
}

export interface AssessmentResult {
  student_id: number; name: string; nis: string | null; submitted_at: string | null; score: number | null;
}

export interface Assignment {
  id: number; title: string; description: string | null; type: string; deadline: string;
  class_id: number; class: string; subject: string; submitted: number; total: number;
}

export interface SubmissionRow {
  student_id: number; name: string; nis: string | null; submission_id: number | null;
  submitted_at: string | null; note: string | null; file_name: string | null; has_file: boolean;
  score: number | null; feedback: string | null;
}

export interface GradeRow {
  student_id: number; student: string; nis: string | null;
  tugas: number | null; uh: number | null; uts: number | null; uas: number | null;
  final: number | null; predikat: string;
}

export interface GradeBook {
  class: string; subject: string | null; kkm: number;
  summary: { average: number | null; highest: number | null; highest_name: string | null; pass_percent: number | null };
  rows: GradeRow[];
}

export interface StudentAssignment {
  id: number; title: string; description: string | null; type: string; subject: string; teacher: string;
  deadline: string; status: "Sudah Dikumpulkan" | "Belum Dikumpulkan" | "Terlambat";
  submitted_at: string | null; submission_id: number | null; note: string | null;
  file_name: string | null; has_file: boolean; score: number | null; feedback: string | null;
}

export interface StudentExam {
  id: number; title: string; type: string; subject: string; start_date: string; due_date: string;
  duration_minutes: number; questions: number; status: "Tersedia" | "Mendatang" | "Selesai" | "Ditutup";
  in_progress: boolean; score: number | null;
}

export interface SubjectSummary {
  subject: string; teacher: string; count: number;
  avg: number | null; highest: number | null; lowest: number | null; pass: number | null;
}
