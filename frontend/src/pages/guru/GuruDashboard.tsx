import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useApi } from "../../hooks/useApi";
import { downloadCsv, formatBytes, formatDate, formatDateTime, num, predikatBadge, todayISO } from "../../lib/format";
import type { Assessment, AssessmentResult, Assignment, GradeBook, Material, Meta, Question, SubmissionRow } from "../../lib/types";
import { StudentsReadOnly } from "../../components/PeopleViews";
import { Empty, ErrorBox, Field, FormError, Loading, Modal, ModalActions, Notice, PageHeader, Progress, StatCard, useSave } from "../../components/ui";

const ASSESSMENT_TYPES = ["Kuis", "Ulangan Harian", "Ujian Tengah Semester", "Ujian Akhir Semester"];

interface GuruDash {
  stats: { materials: number; assessments: number; assignments: number; students: number };
  assessments: Assessment[];
  assignments: Assignment[];
}

function ClassSelect({ value, onChange, classes, error }: { value: string; onChange: (v: string) => void; classes: Meta["classes"]; error?: string }) {
  return (
    <Field label="Kelas" error={error}>
      <select className="form-input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Pilih Kelas</option>
        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </Field>
  );
}

function NoClassNotice({ meta }: { meta: Meta | null }) {
  if (!meta || meta.classes.length > 0) return null;
  return <Notice>Anda belum ditugaskan ke kelas mana pun. Minta administrator mengatur kelas yang Anda ajar (menu Guru &amp; Pelajaran).</Notice>;
}

/* ------------------------------------------------------------------ Dashboard */
function Overview() {
  const { data, loading, error, reload } = useApi<GuruDash>("/guru/dashboard");
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const d = data!;
  const stat: [string, string, number, string][] = [
    ["📚", "Materi", d.stats.materials, "Diunggah"],
    ["📝", "Asesmen", d.stats.assessments, "Dibuat"],
    ["📋", "Tugas", d.stats.assignments, "Diberikan"],
    ["🎓", "Siswa", d.stats.students, "Di kelas Anda"],
  ];
  return (
    <div>
      <PageHeader title="Dashboard Guru" subtitle="Kelola pembelajaran dan penilaian siswa Anda" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {stat.map(([icon, label, val, sub]) => <StatCard key={label} icon={icon} label={label} value={val} sub={sub} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="table-container">
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e8f0" }}><div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "1rem" }}>Asesmen Terbaru</div></div>
          <table>
            <thead><tr><th>Judul</th><th>Tipe</th><th>Status</th></tr></thead>
            <tbody>
              {d.assessments.map((a) => <tr key={a.id}><td style={{ fontWeight: 500 }}>{a.title}</td><td style={{ fontSize: "0.8125rem" }}>{a.type}</td><td><span className={`badge ${a.status === "Aktif" ? "badge-green" : "badge-slate"}`}>{a.status}</span></td></tr>)}
            </tbody>
          </table>
          {d.assessments.length === 0 && <Empty text="Belum ada asesmen." />}
        </div>
        <div className="table-container">
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e8f0" }}><div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "1rem" }}>Tugas Berjalan</div></div>
          <table>
            <thead><tr><th>Judul</th><th>Terkumpul</th></tr></thead>
            <tbody>
              {d.assignments.map((a) => <tr key={a.id}><td style={{ fontWeight: 500 }}>{a.title}</td><td><Progress value={a.submitted} total={a.total} width={60} /></td></tr>)}
            </tbody>
          </table>
          {d.assignments.length === 0 && <Empty text="Belum ada tugas." />}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Materi */
function Materials() {
  const { data, loading, error, reload } = useApi<Material[]>("/guru/materials");
  const meta = useApi<Meta>("/meta");
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<Material | null>(null);
  const empty = { title: "", class_id: "", type: "PDF", external_url: "" };
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState<File | null>(null);
  const save = useSave();

  const openAdd = () => { setEdit(null); setForm(empty); setFile(null); save.reset(); setModal(true); };
  const openEdit = (m: Material) => { setEdit(m); setForm({ title: m.title, class_id: String(m.class_id), type: m.type, external_url: m.external_url ?? "" }); setFile(null); save.reset(); setModal(true); };

  const submit = async () => {
    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("class_id", form.class_id);
    fd.append("type", form.type);
    fd.append("external_url", form.external_url);
    if (file) fd.append("file", file);
    const ok = await save.run(() => edit ? api.post(`/guru/materials/${edit.id}`, fd) : api.post("/guru/materials", fd));
    if (ok) { setModal(false); reload(); }
  };
  const remove = async (m: Material) => {
    if (!window.confirm(`Hapus materi "${m.title}"?`)) return;
    try { await api.del(`/guru/materials/${m.id}`); reload(); } catch (e) { window.alert(e instanceof Error ? e.message : "Gagal menghapus."); }
  };
  const download = async (m: Material) => {
    try { await api.download(`/materials/${m.id}/download`, m.file_name ?? m.title); } catch (e) { window.alert(e instanceof Error ? e.message : "Gagal mengunduh."); }
  };

  return (
    <div>
      <PageHeader title="Materi Pelajaran" subtitle="Kelola materi dan bahan ajar" action={<button className="btn-primary" onClick={openAdd}>+ Upload Materi</button>} />
      <NoClassNotice meta={meta.data} />
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <div className="table-container">
          <table>
            <thead><tr><th>Judul Materi</th><th>Kelas</th><th>Mata Pelajaran</th><th>Tipe</th><th>Ukuran</th><th>Tanggal Upload</th><th>Aksi</th></tr></thead>
            <tbody>
              {(data ?? []).map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 500 }}>{m.title}</td>
                  <td><span className="badge badge-blue">{m.class}</span></td>
                  <td>{m.subject}</td>
                  <td><span className={`badge ${m.type === "PDF" ? "badge-red" : "badge-purple"}`}>{m.type}</span></td>
                  <td style={{ color: "#64748b" }}>{m.has_file ? formatBytes(m.size) : "Link"}</td>
                  <td style={{ color: "#64748b" }}>{formatDate(m.uploaded)}</td>
                  <td style={{ display: "flex", gap: "0.375rem" }}>
                    {m.has_file && <button className="btn-edit" onClick={() => download(m)}>Unduh</button>}
                    {m.external_url && <a className="btn-edit" style={{ textDecoration: "none" }} href={m.external_url} target="_blank" rel="noreferrer noopener">Buka</a>}
                    <button className="btn-edit" onClick={() => openEdit(m)}>Edit</button>
                    <button className="btn-danger" onClick={() => remove(m)}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data ?? []).length === 0 && <Empty text="Belum ada materi. Klik “Upload Materi” untuk menambah." />}
        </div>
      )}
      {modal && (
        <Modal title={edit ? "Edit Materi" : "Upload Materi Baru"} onClose={() => setModal(false)}>
          <FormError message={save.error} />
          <Field label="Judul Materi" error={save.fieldErrors.title}><input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <ClassSelect value={form.class_id} onChange={(v) => setForm({ ...form, class_id: v })} classes={meta.data?.classes ?? []} error={save.fieldErrors.class_id} />
          <Field label="Tipe Materi" error={save.fieldErrors.type}>
            <select className="form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option>PDF</option><option>Video</option><option>Presentasi</option>
            </select>
          </Field>
          <Field label={edit && edit.has_file ? "Ganti File (opsional)" : "File"} error={save.fieldErrors.file} hint="PDF, Word, Excel, PowerPoint, ZIP, gambar, atau video (maks. 25 MB).">
            <input type="file" className="form-input" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
          <Field label="atau Link Materi" error={save.fieldErrors.external_url} hint="Untuk video/YouTube/Google Drive. Boleh dikosongkan jika mengunggah file.">
            <input className="form-input" placeholder="https://..." value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} />
          </Field>
          <ModalActions onCancel={() => setModal(false)} onSave={submit} saving={save.saving} />
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Asesmen */
function QuestionManager({ assessment, onClose, onChanged }: { assessment: Assessment; onClose: () => void; onChanged: () => void }) {
  const { data, loading, error, reload } = useApi<Question[]>(`/guru/assessments/${assessment.id}/questions`);
  const empty = { question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "A" };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const save = useSave();
  const locked = assessment.attempts > 0;

  const startEdit = (q: Question) => { setEditId(q.id); setForm({ question: q.question, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d, correct_option: q.correct_option }); save.reset(); };
  const cancelEdit = () => { setEditId(null); setForm(empty); save.reset(); };

  const submit = async () => {
    const ok = await save.run(() => editId ? api.put(`/guru/questions/${editId}`, form) : api.post(`/guru/assessments/${assessment.id}/questions`, form));
    if (ok) { cancelEdit(); reload(); onChanged(); }
  };
  const remove = async (q: Question) => {
    if (!window.confirm("Hapus soal ini?")) return;
    try { await api.del(`/guru/questions/${q.id}`); reload(); onChanged(); } catch (e) { window.alert(e instanceof Error ? e.message : "Gagal menghapus."); }
  };

  const opt = (k: "a" | "b" | "c" | "d", label: string) => (
    <Field key={k} label={`Pilihan ${label}`} error={save.fieldErrors[`option_${k}`]}>
      <input className="form-input" value={form[`option_${k}` as const]} onChange={(e) => setForm({ ...form, [`option_${k}`]: e.target.value })} disabled={locked} />
    </Field>
  );

  return (
    <Modal title={`Soal: ${assessment.title}`} onClose={onClose} wide>
      {locked && <Notice>Sudah ada {assessment.attempts} siswa yang mengerjakan, sehingga soal tidak dapat diubah lagi.</Notice>}
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
          {(data ?? []).map((q, i) => (
            <div key={q.id} style={{ border: "1px solid #e2e8f0", borderRadius: "0.5rem", padding: "0.75rem", display: "flex", justifyContent: "space-between", gap: "1rem" }}>
              <div style={{ fontSize: "0.875rem" }}>
                <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{i + 1}. {q.question}</div>
                <div style={{ color: "#64748b", fontSize: "0.8125rem" }}>
                  {(["A", "B", "C", "D"] as const).map((k) => {
                    const text = q[`option_${k.toLowerCase()}` as "option_a"];
                    return <span key={k} style={{ marginRight: "0.875rem", color: q.correct_option === k ? "#16a34a" : undefined, fontWeight: q.correct_option === k ? 700 : 400 }}>{k}. {text}</span>;
                  })}
                </div>
              </div>
              {!locked && (
                <div style={{ display: "flex", gap: "0.375rem", flexShrink: 0 }}>
                  <button className="btn-edit" onClick={() => startEdit(q)}>Edit</button>
                  <button className="btn-danger" onClick={() => remove(q)}>Hapus</button>
                </div>
              )}
            </div>
          ))}
          {(data ?? []).length === 0 && <Empty text="Belum ada soal." />}
        </div>
      )}
      {!locked && (
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>{editId ? "Edit Soal" : "Tambah Soal (Pilihan Ganda)"}</div>
          <FormError message={save.error} />
          <Field label="Pertanyaan" error={save.fieldErrors.question}><textarea className="form-input" rows={2} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
            {opt("a", "A")}{opt("b", "B")}{opt("c", "C")}{opt("d", "D")}
          </div>
          <Field label="Kunci Jawaban" error={save.fieldErrors.correct_option}>
            <select className="form-input" value={form.correct_option} onChange={(e) => setForm({ ...form, correct_option: e.target.value })}>
              <option>A</option><option>B</option><option>C</option><option>D</option>
            </select>
          </Field>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            {editId && <button onClick={cancelEdit} style={{ padding: "0.5rem 1rem", border: "1px solid #e2e8f0", borderRadius: "0.5rem", background: "white", cursor: "pointer", fontSize: "0.875rem" }}>Batal Edit</button>}
            <button className="btn-primary" onClick={submit} disabled={save.saving}>{save.saving ? "Menyimpan..." : editId ? "Simpan Perubahan" : "+ Tambah Soal"}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ResultsModal({ assessment, onClose }: { assessment: Assessment; onClose: () => void }) {
  const { data, loading, error, reload } = useApi<AssessmentResult[]>(`/guru/assessments/${assessment.id}/results`);
  return (
    <Modal title={`Hasil: ${assessment.title}`} onClose={onClose} wide>
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <div className="table-container">
          <table>
            <thead><tr><th>Nama Siswa</th><th>NIS</th><th>Dikumpulkan</th><th>Skor</th></tr></thead>
            <tbody>
              {(data ?? []).map((r) => (
                <tr key={r.student_id}>
                  <td style={{ fontWeight: 500 }}>{r.name}</td>
                  <td style={{ fontFamily: "monospace", color: "#64748b" }}>{r.nis ?? "-"}</td>
                  <td style={{ color: "#64748b" }}>{r.submitted_at ? formatDateTime(r.submitted_at) : <span className="badge badge-slate">Belum</span>}</td>
                  <td style={{ fontWeight: 700, color: "#1e40af" }}>{num(r.score)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data ?? []).length === 0 && <Empty text="Belum ada siswa di kelas ini." />}
        </div>
      )}
    </Modal>
  );
}

function Assessments() {
  const { data, loading, error, reload } = useApi<Assessment[]>("/guru/assessments");
  const meta = useApi<Meta>("/meta");
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<Assessment | null>(null);
  const [qFor, setQFor] = useState<Assessment | null>(null);
  const [rFor, setRFor] = useState<Assessment | null>(null);
  const empty = { title: "", type: "Kuis", class_id: "", start_date: todayISO(), due_date: todayISO(), duration_minutes: "60", status: "Draft" };
  const [form, setForm] = useState(empty);
  const save = useSave();

  // Perbarui modal soal bila data asesmen dimuat ulang (jumlah soal berubah)
  useEffect(() => { if (qFor && data) setQFor(data.find((a) => a.id === qFor.id) ?? null); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd = () => { setEdit(null); setForm(empty); save.reset(); setModal(true); };
  const openEdit = (a: Assessment) => { setEdit(a); setForm({ title: a.title, type: a.type, class_id: String(a.class_id), start_date: a.start_date, due_date: a.due_date, duration_minutes: String(a.duration_minutes), status: a.status }); save.reset(); setModal(true); };

  const submit = async () => {
    const ok = await save.run(() => edit ? api.put(`/guru/assessments/${edit.id}`, form) : api.post("/guru/assessments", form));
    if (ok) { setModal(false); reload(); }
  };
  const remove = async (a: Assessment) => {
    if (!window.confirm(`Hapus asesmen "${a.title}"? Semua soal dan hasil siswa ikut terhapus.`)) return;
    try { await api.del(`/guru/assessments/${a.id}`); reload(); } catch (e) { window.alert(e instanceof Error ? e.message : "Gagal menghapus."); }
  };

  return (
    <div>
      <PageHeader title="Asesmen & Kuis" subtitle="Buat dan kelola soal ujian, kuis, dan ulangan" action={<button className="btn-primary" onClick={openAdd}>+ Buat Asesmen</button>} />
      <NoClassNotice meta={meta.data} />
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <div className="table-container">
          <table>
            <thead><tr><th>Judul</th><th>Tipe</th><th>Kelas</th><th>Periode</th><th>Soal</th><th>Dikerjakan</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {(data ?? []).map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 500 }}>{a.title}</td>
                  <td><span className="badge badge-purple">{a.type}</span></td>
                  <td><span className="badge badge-blue">{a.class}</span></td>
                  <td style={{ color: "#64748b", fontSize: "0.8125rem" }}>{formatDate(a.start_date)} - {formatDate(a.due_date)}<br />{a.duration_minutes} menit</td>
                  <td>{a.questions} soal</td>
                  <td>{a.attempts}</td>
                  <td><span className={`badge ${a.status === "Aktif" ? "badge-green" : "badge-slate"}`}>{a.status}</span></td>
                  <td style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                    <button className="btn-edit" onClick={() => setQFor(a)}>Soal</button>
                    <button className="btn-edit" onClick={() => setRFor(a)}>Hasil</button>
                    <button className="btn-edit" onClick={() => openEdit(a)}>Edit</button>
                    <button className="btn-danger" onClick={() => remove(a)}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data ?? []).length === 0 && <Empty text="Belum ada asesmen." />}
        </div>
      )}
      {modal && (
        <Modal title={edit ? "Edit Asesmen" : "Buat Asesmen Baru"} onClose={() => setModal(false)}>
          <FormError message={save.error} />
          <Field label="Judul Asesmen" error={save.fieldErrors.title}><input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Tipe Asesmen" error={save.fieldErrors.type}>
            <select className="form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{ASSESSMENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          </Field>
          <ClassSelect value={form.class_id} onChange={(v) => setForm({ ...form, class_id: v })} classes={meta.data?.classes ?? []} error={save.fieldErrors.class_id} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
            <Field label="Tanggal Mulai" error={save.fieldErrors.start_date}><input type="date" className="form-input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
            <Field label="Batas Akhir" error={save.fieldErrors.due_date}><input type="date" className="form-input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
          </div>
          <Field label="Durasi (menit)" error={save.fieldErrors.duration_minutes}><input type="number" min={5} max={300} className="form-input" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} /></Field>
          <Field label="Status" error={save.fieldErrors.status} hint="Siswa hanya melihat asesmen berstatus Aktif. Asesmen Aktif harus punya minimal 1 soal.">
            <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Draft</option><option>Aktif</option></select>
          </Field>
          <ModalActions onCancel={() => setModal(false)} onSave={submit} saving={save.saving} />
        </Modal>
      )}
      {qFor && <QuestionManager assessment={qFor} onClose={() => setQFor(null)} onChanged={reload} />}
      {rFor && <ResultsModal assessment={rFor} onClose={() => setRFor(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ Tugas */
function SubmissionsModal({ assignment, onClose, onChanged }: { assignment: Assignment; onClose: () => void; onChanged: () => void }) {
  const { data, loading, error, reload } = useApi<SubmissionRow[]>(`/guru/assignments/${assignment.id}/submissions`);
  const [grading, setGrading] = useState<SubmissionRow | null>(null);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const save = useSave();

  const openGrade = (s: SubmissionRow) => { setGrading(s); setScore(s.score === null ? "" : String(s.score)); setFeedback(s.feedback ?? ""); save.reset(); };
  const submitGrade = async () => {
    if (!grading?.submission_id) return;
    const ok = await save.run(() => api.put(`/guru/submissions/${grading.submission_id}/grade`, { score, feedback }));
    if (ok) { setGrading(null); reload(); onChanged(); }
  };
  const download = async (s: SubmissionRow) => {
    try { await api.download(`/submissions/${s.submission_id}/download`, s.file_name ?? "tugas"); } catch (e) { window.alert(e instanceof Error ? e.message : "Gagal mengunduh."); }
  };

  return (
    <Modal title={`Pengumpulan: ${assignment.title}`} onClose={onClose} wide>
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <div className="table-container">
          <table>
            <thead><tr><th>Siswa</th><th>Status</th><th>Jawaban</th><th>Nilai</th><th>Aksi</th></tr></thead>
            <tbody>
              {(data ?? []).map((s) => (
                <tr key={s.student_id}>
                  <td><div style={{ fontWeight: 500 }}>{s.name}</div><div style={{ fontSize: "0.75rem", color: "#94a3b8", fontFamily: "monospace" }}>{s.nis ?? "-"}</div></td>
                  <td>{s.submission_id ? <><span className="badge badge-green">Terkumpul</span><div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 2 }}>{formatDateTime(s.submitted_at)}</div></> : <span className="badge badge-red">Belum</span>}</td>
                  <td style={{ maxWidth: 220, fontSize: "0.8125rem", color: "#475569" }}>{s.note ? <div style={{ whiteSpace: "pre-wrap", maxHeight: 80, overflow: "auto" }}>{s.note}</div> : "-"}{s.has_file && <button className="btn-edit" style={{ marginTop: 4 }} onClick={() => download(s)}>⬇ {s.file_name}</button>}</td>
                  <td style={{ fontWeight: 700, color: "#1e40af" }}>{num(s.score)}</td>
                  <td>{s.submission_id && <button className="btn-edit" onClick={() => openGrade(s)}>{s.score === null ? "Beri Nilai" : "Ubah Nilai"}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data ?? []).length === 0 && <Empty text="Belum ada siswa di kelas ini." />}
        </div>
      )}
      {grading && (
        <Modal title={`Nilai: ${grading.name}`} onClose={() => setGrading(null)}>
          <FormError message={save.error} />
          <Field label="Nilai (0 - 100)" error={save.fieldErrors.score}><input type="number" min={0} max={100} className="form-input" value={score} onChange={(e) => setScore(e.target.value)} /></Field>
          <Field label="Catatan untuk siswa (opsional)" error={save.fieldErrors.feedback}><textarea className="form-input" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} /></Field>
          <ModalActions onCancel={() => setGrading(null)} onSave={submitGrade} saving={save.saving} />
        </Modal>
      )}
    </Modal>
  );
}

function Assignments() {
  const { data, loading, error, reload } = useApi<Assignment[]>("/guru/assignments");
  const meta = useApi<Meta>("/meta");
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<Assignment | null>(null);
  const [subFor, setSubFor] = useState<Assignment | null>(null);
  const empty = { title: "", description: "", type: "Tugas", class_id: "", deadline: todayISO() };
  const [form, setForm] = useState(empty);
  const save = useSave();

  const openAdd = () => { setEdit(null); setForm(empty); save.reset(); setModal(true); };
  const openEdit = (a: Assignment) => { setEdit(a); setForm({ title: a.title, description: a.description ?? "", type: a.type, class_id: String(a.class_id), deadline: a.deadline }); save.reset(); setModal(true); };
  const submit = async () => {
    const ok = await save.run(() => edit ? api.put(`/guru/assignments/${edit.id}`, form) : api.post("/guru/assignments", form));
    if (ok) { setModal(false); reload(); }
  };
  const remove = async (a: Assignment) => {
    if (!window.confirm(`Hapus tugas "${a.title}"? Pengumpulan siswa ikut terhapus.`)) return;
    try { await api.del(`/guru/assignments/${a.id}`); reload(); } catch (e) { window.alert(e instanceof Error ? e.message : "Gagal menghapus."); }
  };

  return (
    <div>
      <PageHeader title="Tugas & Proyek" subtitle="Kelola tugas dan proyek siswa" action={<button className="btn-primary" onClick={openAdd}>+ Buat Tugas</button>} />
      <NoClassNotice meta={meta.data} />
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <div className="table-container">
          <table>
            <thead><tr><th>Judul Tugas</th><th>Kelas</th><th>Tipe</th><th>Deadline</th><th>Pengumpulan</th><th>Aksi</th></tr></thead>
            <tbody>
              {(data ?? []).map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 500 }}>{a.title}</td>
                  <td><span className="badge badge-blue">{a.class}</span></td>
                  <td><span className="badge badge-amber">{a.type}</span></td>
                  <td style={{ color: "#64748b" }}>{formatDate(a.deadline)}</td>
                  <td><Progress value={a.submitted} total={a.total} /></td>
                  <td style={{ display: "flex", gap: "0.375rem" }}>
                    <button className="btn-edit" onClick={() => setSubFor(a)}>Nilai</button>
                    <button className="btn-edit" onClick={() => openEdit(a)}>Edit</button>
                    <button className="btn-danger" onClick={() => remove(a)}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data ?? []).length === 0 && <Empty text="Belum ada tugas." />}
        </div>
      )}
      {modal && (
        <Modal title={edit ? "Edit Tugas" : "Buat Tugas Baru"} onClose={() => setModal(false)}>
          <FormError message={save.error} />
          <Field label="Judul Tugas" error={save.fieldErrors.title}><input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Deskripsi / Instruksi" error={save.fieldErrors.description}><textarea className="form-input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <ClassSelect value={form.class_id} onChange={(v) => setForm({ ...form, class_id: v })} classes={meta.data?.classes ?? []} error={save.fieldErrors.class_id} />
          <Field label="Tipe" error={save.fieldErrors.type}>
            <select className="form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>Tugas</option><option>Proyek</option><option>Praktikum</option></select>
          </Field>
          <Field label="Deadline" error={save.fieldErrors.deadline}><input type="date" className="form-input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></Field>
          <ModalActions onCancel={() => setModal(false)} onSave={submit} saving={save.saving} />
        </Modal>
      )}
      {subFor && <SubmissionsModal assignment={subFor} onClose={() => setSubFor(null)} onChanged={reload} />}
    </div>
  );
}

/* ------------------------------------------------------------------ Nilai */
function Grades() {
  const meta = useApi<Meta>("/meta");
  const classes = meta.data?.classes ?? [];
  const [classId, setClassId] = useState("");
  useEffect(() => { if (!classId && classes.length) setClassId(String(classes[0].id)); }, [classes, classId]);
  const { data, loading, error, reload } = useApi<GradeBook>(classId ? `/guru/grades?class_id=${classId}` : null);

  const exportCsv = () => {
    if (!data) return;
    downloadCsv(`nilai-${data.class}-${data.subject ?? "mapel"}.csv`, [
      ["Nama Siswa", "NIS", "Tugas", "UH/Kuis", "UTS", "UAS", "Nilai Akhir", "Predikat"],
      ...data.rows.map((r) => [r.student, r.nis, r.tugas, r.uh, r.uts, r.uas, r.final, r.predikat]),
    ]);
  };

  return (
    <div>
      <PageHeader
        title="Generate Nilai Per Mapel"
        subtitle={data ? `Kelas ${data.class} · ${data.subject ?? "-"} · KKM ${data.kkm}` : "Pilih kelas untuk melihat rekap nilai"}
        action={
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <select className="form-input" style={{ width: 180 }} value={classId} onChange={(e) => setClassId(e.target.value)}>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="btn-primary" onClick={exportCsv} disabled={!data}>⬇ Export CSV</button>
          </div>
        }
      />
      <NoClassNotice meta={meta.data} />
      {!classId ? null : loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
            {[["Rata-rata Kelas", num(data.summary.average), "Nilai akhir berbobot"], ["Nilai Tertinggi", num(data.summary.highest), data.summary.highest_name ?? "-"], ["Persentase Lulus", data.summary.pass_percent === null ? "-" : `${data.summary.pass_percent}%`, `Nilai ≥ KKM ${data.kkm}`]].map(([label, val, sub]) => (
              <div key={label} className="stat-card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.8125rem", color: "#64748b" }}>{label}</div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "2rem", fontWeight: 800, color: "#1e40af" }}>{val}</div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{sub}</div>
              </div>
            ))}
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>Nama Siswa</th><th>NIS</th><th>Tugas</th><th>UH/Kuis</th><th>UTS</th><th>UAS</th><th>Nilai Akhir</th><th>Predikat</th></tr></thead>
              <tbody>
                {data.rows.map((g) => (
                  <tr key={g.student_id}>
                    <td style={{ fontWeight: 500 }}>{g.student}</td>
                    <td style={{ fontFamily: "monospace", color: "#64748b" }}>{g.nis ?? "-"}</td>
                    <td>{num(g.tugas)}</td><td>{num(g.uh)}</td><td>{num(g.uts)}</td><td>{num(g.uas)}</td>
                    <td style={{ fontWeight: 700, color: "#1e40af" }}>{num(g.final)}</td>
                    <td><span className={`badge ${predikatBadge(g.predikat)}`}>{g.predikat}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.rows.length === 0 && <Empty text="Belum ada siswa di kelas ini." />}
          </div>
          <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.75rem" }}>
            Nilai akhir = Tugas 20% + UH/Kuis 30% + UTS 20% + UAS 30% (bobot dinormalisasi bila ada komponen yang belum ada nilainya). Tanda “-” berarti belum ada nilai.
          </p>
        </>
      )}
    </div>
  );
}

export default function GuruDashboard({ page }: { page: string }) {
  switch (page) {
    case "dashboard": return <Overview />;
    case "materials": return <Materials />;
    case "assessments": return <Assessments />;
    case "assignments": return <Assignments />;
    case "grades": return <Grades />;
    case "students": return <StudentsReadOnly subtitle="Daftar siswa di kelas yang Anda ajar" />;
    default: return null;
  }
}
