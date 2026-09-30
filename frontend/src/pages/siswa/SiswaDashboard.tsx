import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { useApi } from "../../hooks/useApi";
import { formatBytes, formatDate, formatDateTime, num } from "../../lib/format";
import type { Material, StudentAssignment, StudentExam } from "../../lib/types";
import { Empty, ErrorBox, Field, FormError, Loading, Modal, ModalActions, PageHeader, StatCard, useSave } from "../../components/ui";

interface SiswaDash {
  stats: { materials: number; active_assignments: number; exams_available: number; average: number | null };
  assignments: StudentAssignment[];
  exams: StudentExam[];
}

interface ExamSession {
  exam: { id: number; title: string; subject: string; duration_minutes: number };
  remaining_seconds: number;
  questions: { id: number; question: string; options: Record<string, string> }[];
}

const assignmentBadge = (s: string) => s === "Sudah Dikumpulkan" ? "badge-green" : s === "Terlambat" ? "badge-red" : "badge-amber";
const examBadge = (s: string) => s === "Tersedia" ? "badge-green" : s === "Selesai" ? "badge-blue" : "badge-slate";

/* ------------------------------------------------------------------ Dashboard */
function Overview() {
  const { user } = useAuth();
  const student = user?.student;
  const { data, loading, error, reload } = useApi<SiswaDash>("/siswa/dashboard");
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const d = data!;
  const stats: [string, string, string | number, string][] = [
    ["📚", "Materi Tersedia", d.stats.materials, "Siap diunduh"],
    ["📋", "Tugas Aktif", d.stats.active_assignments, "Perlu diselesaikan"],
    ["📝", "Ujian Tersedia", d.stats.exams_available, "Siap dikerjakan"],
    ["⭐", "Rata-rata Nilai", d.stats.average === null ? "-" : num(d.stats.average), "Ujian & tugas"],
  ];
  return (
    <div>
      <PageHeader title="Dashboard Siswa" subtitle={`${user?.name} · ${student?.class ?? "-"} · NIS: ${student?.nis ?? "-"} · ${student?.major ?? "-"}`} />
      <div style={{ background: "linear-gradient(135deg, #0f172a, #1e3a8a)", borderRadius: "1rem", padding: "1.5rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(16,185,129,0.2)", border: "3px solid rgba(16,185,129,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.875rem", flexShrink: 0 }}>🎒</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "1.25rem", fontWeight: 700, color: "white" }}>{user?.name}</div>
          <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginTop: "0.25rem" }}>NIS: {student?.nis ?? "-"} &nbsp;·&nbsp; {student?.class ?? "-"}</div>
        </div>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          {[["Jurusan", student?.majorCode ?? "-"], ["Status", "Aktif"]].map(([label, val]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "1rem", fontWeight: 700, color: "#34d399" }}>{val}</div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {stats.map(([icon, label, val, sub]) => <StatCard key={label} icon={icon} label={label} value={val} color="#10b981" sub={sub} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="table-container">
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e8f0" }}><div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>Tugas Terbaru</div></div>
          <table>
            <thead><tr><th>Tugas</th><th>Deadline</th><th>Status</th></tr></thead>
            <tbody>
              {d.assignments.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 500 }}>{a.title}</td>
                  <td style={{ color: "#64748b", fontSize: "0.8125rem" }}>{formatDate(a.deadline)}</td>
                  <td><span className={`badge ${assignmentBadge(a.status)}`}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {d.assignments.length === 0 && <Empty text="Belum ada tugas." />}
        </div>
        <div className="table-container">
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e8f0" }}><div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>Ujian & Kuis</div></div>
          <table>
            <thead><tr><th>Ujian</th><th>Periode</th><th>Status</th></tr></thead>
            <tbody>
              {d.exams.map((e) => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 500 }}>{e.title}</td>
                  <td style={{ color: "#64748b", fontSize: "0.8125rem" }}>{formatDate(e.start_date)}</td>
                  <td><span className={`badge ${examBadge(e.status)}`}>{e.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {d.exams.length === 0 && <Empty text="Belum ada ujian." />}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Materi */
function Materials() {
  const { data, loading, error, reload } = useApi<Material[]>("/siswa/materials");
  const download = async (m: Material) => {
    try { await api.download(`/materials/${m.id}/download`, m.file_name ?? m.title); } catch (e) { window.alert(e instanceof Error ? e.message : "Gagal mengunduh."); }
  };
  return (
    <div>
      <PageHeader title="Materi Pelajaran" subtitle="Download dan akses materi dari guru Anda" />
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "1rem" }}>
            {(data ?? []).map((m) => (
              <div key={m.id} className="stat-card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ width: 56, height: 56, borderRadius: "0.75rem", background: m.type === "PDF" ? "#fee2e2" : "#f3e8ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem", flexShrink: 0 }}>
                  {m.type === "PDF" ? "📄" : m.type === "Video" ? "🎥" : "📊"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9375rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</div>
                  <div style={{ fontSize: "0.8125rem", color: "#64748b" }}>{m.subject} · {m.teacher ?? "-"}</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.125rem" }}>{m.has_file ? formatBytes(m.size) : "Tautan"} · {formatDate(m.uploaded)}</div>
                </div>
                {m.has_file && <button className="btn-primary" style={{ flexShrink: 0, fontSize: "0.8125rem" }} onClick={() => download(m)}>⬇ Unduh</button>}
                {m.external_url && <a className="btn-primary" style={{ flexShrink: 0, fontSize: "0.8125rem", textDecoration: "none" }} href={m.external_url} target="_blank" rel="noreferrer noopener">↗ Buka</a>}
              </div>
            ))}
          </div>
          {(data ?? []).length === 0 && <Empty text="Belum ada materi untuk kelas Anda." />}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Tugas */
function Assignments() {
  const { data, loading, error, reload } = useApi<StudentAssignment[]>("/siswa/assignments");
  const [target, setTarget] = useState<StudentAssignment | null>(null);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const save = useSave();

  const open = (a: StudentAssignment) => { setTarget(a); setNote(a.note ?? ""); setFile(null); save.reset(); };
  const submit = async () => {
    if (!target) return;
    const fd = new FormData();
    fd.append("note", note);
    if (file) fd.append("file", file);
    const ok = await save.run(() => api.post(`/siswa/assignments/${target.id}/submit`, fd));
    if (ok) { setTarget(null); reload(); }
  };
  const download = async (a: StudentAssignment) => {
    try { await api.download(`/submissions/${a.submission_id}/download`, a.file_name ?? "tugas"); } catch (e) { window.alert(e instanceof Error ? e.message : "Gagal mengunduh."); }
  };

  return (
    <div>
      <PageHeader title="Tugas Saya" subtitle="Kerjakan dan kumpulkan tugas tepat waktu" />
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {(data ?? []).map((a) => (
            <div key={a.id} className="stat-card" style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
              <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.375rem", flexShrink: 0 }}>📋</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9375rem" }}>{a.title}</div>
                <div style={{ fontSize: "0.8125rem", color: "#64748b" }}>{a.subject} · {a.teacher} · Deadline: {formatDate(a.deadline)}</div>
                {a.description && <div style={{ fontSize: "0.8125rem", color: "#475569", marginTop: "0.375rem", whiteSpace: "pre-wrap" }}>{a.description}</div>}
                {a.score !== null && <div style={{ fontSize: "0.8125rem", color: "#16a34a", fontWeight: 600, marginTop: "0.25rem" }}>Nilai: {num(a.score)}{a.feedback ? ` · ${a.feedback}` : ""}</div>}
                {a.submitted_at && <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.125rem" }}>Dikumpulkan {formatDateTime(a.submitted_at)}</div>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
                <span className={`badge ${assignmentBadge(a.status)}`}>{a.status}</span>
                {a.has_file && <button className="btn-edit" onClick={() => download(a)}>⬇ File saya</button>}
                {a.score === null && (
                  <button className="btn-primary" style={{ fontSize: "0.8125rem" }} onClick={() => open(a)}>
                    {a.status === "Sudah Dikumpulkan" ? "Ubah Jawaban" : a.status === "Terlambat" ? "Kumpulkan (Terlambat)" : "Kumpulkan"}
                  </button>
                )}
              </div>
            </div>
          ))}
          {(data ?? []).length === 0 && <Empty text="Belum ada tugas untuk kelas Anda." />}
        </div>
      )}
      {target && (
        <Modal title={target.title} onClose={() => setTarget(null)}>
          <FormError message={save.error} />
          <Field label="Jawaban / Catatan" error={save.fieldErrors.note}><textarea className="form-input" rows={4} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <Field label={target.has_file ? "Ganti File (opsional)" : "File Tugas (opsional)"} error={save.fieldErrors.file} hint="Maks. 25 MB. Isi jawaban, unggah file, atau keduanya.">
            <input type="file" className="form-input" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
          <ModalActions onCancel={() => setTarget(null)} onSave={submit} saving={save.saving} saveLabel="Kumpulkan" />
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Ujian */
function ExamRunner({ session, onDone, onExit }: { session: ExamSession; onDone: (r: { score: number; correct: number; total: number }) => void; onExit: () => void }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [remaining, setRemaining] = useState(session.remaining_seconds);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const submit = async (auto = false) => {
    if (submittedRef.current) return;
    if (!auto) {
      const unanswered = session.questions.length - Object.keys(answersRef.current).length;
      if (unanswered > 0 && !window.confirm(`Masih ada ${unanswered} soal belum dijawab. Kumpulkan sekarang?`)) return;
    }
    submittedRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      onDone(await api.post(`/siswa/exams/${session.exam.id}/submit`, { answers: answersRef.current }));
    } catch (e) {
      submittedRef.current = false;
      setSubmitting(false);
      setError(e instanceof Error ? e.message : "Gagal mengumpulkan jawaban.");
    }
  };

  useEffect(() => {
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (remaining === 0) void submit(true); }, [remaining]); // eslint-disable-line react-hooks/exhaustive-deps

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", gap: "1rem" }}>
        <div><h1 className="page-title">{session.exam.title}</h1><p className="page-subtitle">{session.exam.subject} · {session.questions.length} soal</p></div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <div style={{ fontFamily: "monospace", fontSize: "1.25rem", fontWeight: 700, color: remaining < 60 ? "#dc2626" : "#0f172a", background: "white", border: "1px solid #e2e8f0", borderRadius: "0.5rem", padding: "0.375rem 0.875rem" }}>⏱ {mm}:{ss}</div>
          <button onClick={() => { if (window.confirm("Keluar sementara? Waktu ujian tetap berjalan, Anda bisa melanjutkan dari daftar ujian.")) onExit(); }} style={{ padding: "0.5rem 1rem", border: "1px solid #e2e8f0", borderRadius: "0.5rem", background: "white", cursor: "pointer" }}>Keluar</button>
          <button className="btn-primary" onClick={() => submit(false)} disabled={submitting}>{submitting ? "Mengirim..." : "Kumpulkan Jawaban"}</button>
        </div>
      </div>
      {error && <FormError message={error} />}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {session.questions.map((q, qi) => (
          <div key={q.id} className="stat-card">
            <div style={{ fontWeight: 600, marginBottom: "1rem", color: "#0f172a" }}>{qi + 1}. {q.question}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {Object.entries(q.options).map(([letter, text]) => {
                const selected = answers[q.id] === letter;
                return (
                  <button key={letter} onClick={() => setAnswers({ ...answers, [q.id]: letter })}
                    style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: `2px solid ${selected ? "#2563eb" : "#e2e8f0"}`, background: selected ? "#eff6ff" : "white", cursor: "pointer", textAlign: "left" }}>
                    <span style={{ width: 28, height: 28, borderRadius: "50%", background: selected ? "#2563eb" : "#f1f5f9", color: selected ? "white" : "#64748b", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.8125rem", flexShrink: 0 }}>{letter}</span>
                    <span style={{ fontSize: "0.875rem", color: "#334155" }}>{text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Exams() {
  const { data, loading, error, reload } = useApi<StudentExam[]>("/siswa/exams");
  const [session, setSession] = useState<ExamSession | null>(null);
  const [result, setResult] = useState<{ score: number; correct: number; total: number } | null>(null);
  const [starting, setStarting] = useState<number | null>(null);

  const start = async (e: StudentExam) => {
    if (!e.in_progress && !window.confirm(`Mulai "${e.title}"? Waktu ${e.duration_minutes} menit langsung berjalan dan tidak bisa diulang.`)) return;
    setStarting(e.id);
    try { setSession(await api.post<ExamSession>(`/siswa/exams/${e.id}/start`)); }
    catch (err) { window.alert(err instanceof Error ? err.message : "Tidak dapat memulai ujian."); reload(); }
    finally { setStarting(null); }
  };

  if (session && !result) {
    return <ExamRunner session={session} onDone={(r) => setResult(r)} onExit={() => { setSession(null); reload(); }} />;
  }
  if (result) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: "1rem" }}>
        <div style={{ fontSize: "4rem" }}>🎉</div>
        <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}>Ujian Selesai!</h2>
        <p style={{ color: "#64748b" }}>Jawaban Anda telah berhasil dikumpulkan</p>
        <div className="stat-card" style={{ textAlign: "center", padding: "1.5rem 3rem" }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "3rem", fontWeight: 800, color: "#1e40af" }}>{num(result.score)}</div>
          <div style={{ color: "#64748b" }}>Skor Anda · {result.correct}/{result.total} benar</div>
        </div>
        <button className="btn-primary" onClick={() => { setResult(null); setSession(null); reload(); }}>Kembali ke Daftar Ujian</button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Ujian & Kuis" subtitle="Kerjakan ujian dan kuis yang tersedia" />
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {(data ?? []).map((e) => (
            <div key={e.id} className="stat-card" style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
              <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.375rem", flexShrink: 0 }}>📝</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "#0f172a" }}>{e.title}</div>
                <div style={{ fontSize: "0.8125rem", color: "#64748b" }}>{e.subject} · {formatDate(e.start_date)} - {formatDate(e.due_date)} · {e.duration_minutes} menit · {e.questions} soal</div>
              </div>
              {e.status === "Selesai" && <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, color: "#1e40af", fontSize: "1.25rem" }}>{num(e.score)}</div>}
              <span className={`badge ${examBadge(e.status)}`}>{e.in_progress ? "Berlangsung" : e.status}</span>
              {e.status === "Tersedia" && (
                <button className="btn-primary" disabled={starting === e.id} onClick={() => start(e)}>{e.in_progress ? "Lanjutkan" : "Mulai Ujian"}</button>
              )}
            </div>
          ))}
          {(data ?? []).length === 0 && <Empty text="Belum ada ujian untuk kelas Anda." />}
        </div>
      )}
    </div>
  );
}

export default function SiswaDashboard({ page }: { page: string }) {
  switch (page) {
    case "dashboard": return <Overview />;
    case "materials": return <Materials />;
    case "assignments": return <Assignments />;
    case "exams": return <Exams />;
    default: return null;
  }
}
