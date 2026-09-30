import { useState } from "react";
import { api } from "../../lib/api";
import { useApi } from "../../hooks/useApi";
import { currentAcademicYear, formatDateTime } from "../../lib/format";
import type { Account, ClassRow, Meta, Role, Student, Teacher } from "../../lib/types";
import { Empty, ErrorBox, Field, FormError, Loading, Modal, ModalActions, PageHeader, StatCard, useSave } from "../../components/ui";

const roleLabel: Record<Role, string> = { admin: "Admin", guru: "Guru", siswa: "Siswa", kurikulum: "Kurikulum", kepsek: "Kepsek" };
const roleBadge: Record<Role, string> = { admin: "badge-amber", guru: "badge-blue", siswa: "badge-green", kurikulum: "badge-purple", kepsek: "badge-red" };

function Table({ children }: { children: React.ReactNode }) {
  return <div className="table-container">{children}</div>;
}

/* ------------------------------------------------------------------ Dashboard */
function Overview() {
  const stats = useApi<{ students: number; teachers: number; classes: number; subjects: number; active_classes: number; academic_year: string | null }>("/admin/stats");
  const teachers = useApi<Teacher[]>("/teachers");
  const classes = useApi<ClassRow[]>("/classes");

  if (stats.loading || teachers.loading || classes.loading) return <Loading />;
  const err = stats.error || teachers.error || classes.error;
  if (err) return <ErrorBox message={err} onRetry={() => { stats.reload(); teachers.reload(); classes.reload(); }} />;
  const s = stats.data!;

  return (
    <div>
      <PageHeader title="Dashboard Admin" subtitle="Ringkasan keseluruhan sistem E-Learning Lumora" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <StatCard icon="👥" label="Total Siswa" value={s.students} color="#3b82f6" sub={`${s.active_classes} kelas berisi siswa`} />
        <StatCard icon="👨‍🏫" label="Total Guru" value={s.teachers} color="#10b981" sub="Terdaftar" />
        <StatCard icon="🏫" label="Total Kelas" value={s.classes} color="#8b5cf6" sub={s.academic_year ? `T.A. ${s.academic_year}` : undefined} />
        <StatCard icon="📚" label="Mapel Tersedia" value={s.subjects} color="#f59e0b" sub="Semua kelas" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="table-container">
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>Guru Terdaftar</div>
          </div>
          <table>
            <thead><tr><th>Nama Guru</th><th>Mata Pelajaran</th><th>Status</th></tr></thead>
            <tbody>
              {(teachers.data ?? []).slice(0, 6).map((t) => (
                <tr key={t.id}><td style={{ fontWeight: 500 }}>{t.name}</td><td>{t.subject ?? "-"}</td><td><span className={`badge ${t.status === "Aktif" ? "badge-green" : "badge-slate"}`}>{t.status}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-container">
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>Daftar Kelas</div>
          </div>
          <table>
            <thead><tr><th>Kelas</th><th>Jurusan</th><th>Siswa</th></tr></thead>
            <tbody>
              {(classes.data ?? []).map((c) => (
                <tr key={c.id}><td style={{ fontWeight: 500 }}>{c.name}</td><td>{c.major ?? "-"}</td><td><span className="badge badge-blue">{c.students}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Akun */
function Accounts() {
  const { data, loading, error, reload } = useApi<Account[]>("/admin/accounts");
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<Account | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "guru" as Role, password: "", status: "Aktif" });
  const save = useSave();

  const openAdd = () => { setEdit(null); setForm({ name: "", email: "", role: "guru", password: "", status: "Aktif" }); save.reset(); setModal(true); };
  const openEdit = (a: Account) => { setEdit(a); setForm({ name: a.name, email: a.email, role: a.role, password: "", status: a.status }); save.reset(); setModal(true); };

  const submit = async () => {
    const ok = await save.run(() => edit ? api.put(`/admin/accounts/${edit.id}`, form) : api.post("/admin/accounts", form));
    if (ok) { setModal(false); reload(); }
  };
  const remove = async (a: Account) => {
    if (!window.confirm(`Hapus akun "${a.name}"? Data terkait (materi, tugas, nilai) ikut terhapus.`)) return;
    try { await api.del(`/admin/accounts/${a.id}`); reload(); } catch (e) { window.alert(e instanceof Error ? e.message : "Gagal menghapus."); }
  };

  return (
    <div>
      <PageHeader title="Manajemen Akun" subtitle="Kelola semua akun pengguna sistem" action={<button className="btn-primary" onClick={openAdd}>+ Tambah Akun</button>} />
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <Table>
          <table>
            <thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Status</th><th>Login Terakhir</th><th>Aksi</th></tr></thead>
            <tbody>
              {(data ?? []).map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 500 }}>{a.name}</td>
                  <td style={{ color: "#64748b" }}>{a.email}</td>
                  <td><span className={`badge ${roleBadge[a.role]}`}>{roleLabel[a.role]}</span></td>
                  <td><span className={`badge ${a.status === "Aktif" ? "badge-green" : "badge-slate"}`}>{a.status}</span></td>
                  <td style={{ color: "#94a3b8" }}>{formatDateTime(a.last_login)}</td>
                  <td style={{ display: "flex", gap: "0.375rem" }}>
                    <button className="btn-edit" onClick={() => openEdit(a)}>Edit</button>
                    <button className="btn-danger" onClick={() => remove(a)}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Table>
      )}
      {modal && (
        <Modal title={edit ? "Edit Akun" : "Tambah Akun Baru"} onClose={() => setModal(false)}>
          <FormError message={save.error} />
          <Field label="Nama Lengkap" error={save.fieldErrors.name}><input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email" error={save.fieldErrors.email}><input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Role" error={save.fieldErrors.role}>
            <select className="form-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {(Object.keys(roleLabel) as Role[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
            </select>
          </Field>
          <Field label={edit ? "Password baru" : "Password"} error={save.fieldErrors.password} hint={edit ? "Kosongkan jika tidak ingin mengubah password." : "Minimal 6 karakter."}>
            <input type="password" autoComplete="new-password" className="form-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          {edit && (
            <Field label="Status">
              <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option>Aktif</option><option>Nonaktif</option>
              </select>
            </Field>
          )}
          <ModalActions onCancel={() => setModal(false)} onSave={submit} saving={save.saving} />
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Kelas */
function Classes() {
  const { data, loading, error, reload } = useApi<ClassRow[]>("/classes");
  const meta = useApi<Meta>("/meta");
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<ClassRow | null>(null);
  const [form, setForm] = useState({ name: "", major_id: "", wali_teacher_id: "", year: currentAcademicYear() });
  const save = useSave();

  const openAdd = () => { setEdit(null); setForm({ name: "", major_id: "", wali_teacher_id: "", year: currentAcademicYear() }); save.reset(); setModal(true); };
  const openEdit = (c: ClassRow) => { setEdit(c); setForm({ name: c.name, major_id: String(c.major_id ?? ""), wali_teacher_id: String(c.wali_teacher_id ?? ""), year: c.year }); save.reset(); setModal(true); };

  const submit = async () => {
    const body = { name: form.name, major_id: form.major_id, wali_teacher_id: form.wali_teacher_id || null, year: form.year };
    const ok = await save.run(() => edit ? api.put(`/admin/classes/${edit.id}`, body) : api.post("/admin/classes", body));
    if (ok) { setModal(false); reload(); }
  };
  const remove = async (c: ClassRow) => {
    if (!window.confirm(`Hapus kelas "${c.name}"?`)) return;
    try { await api.del(`/admin/classes/${c.id}`); reload(); } catch (e) { window.alert(e instanceof Error ? e.message : "Gagal menghapus."); }
  };

  return (
    <div>
      <PageHeader title="Kelas & Jurusan" subtitle="Manajemen kelas dan jurusan sekolah" action={<button className="btn-primary" onClick={openAdd}>+ Tambah Kelas</button>} />
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <Table>
          <table>
            <thead><tr><th>Nama Kelas</th><th>Jurusan</th><th>Wali Kelas</th><th>Jumlah Siswa</th><th>T.A.</th><th>Aksi</th></tr></thead>
            <tbody>
              {(data ?? []).map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600, color: "#1e40af" }}>{c.name}</td>
                  <td>{c.major ?? "-"}</td>
                  <td>{c.wali ?? "-"}</td>
                  <td><span className="badge badge-blue">{c.students} siswa</span></td>
                  <td>{c.year}</td>
                  <td style={{ display: "flex", gap: "0.375rem" }}>
                    <button className="btn-edit" onClick={() => openEdit(c)}>Edit</button>
                    <button className="btn-danger" onClick={() => remove(c)}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data ?? []).length === 0 && <Empty text="Belum ada kelas." />}
        </Table>
      )}
      {modal && (
        <Modal title={edit ? "Edit Kelas" : "Tambah Kelas Baru"} onClose={() => setModal(false)}>
          <FormError message={save.error} />
          <Field label="Nama Kelas" error={save.fieldErrors.name}><input className="form-input" placeholder="mis. X PPLG 1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Jurusan" error={save.fieldErrors.major_id}>
            <select className="form-input" value={form.major_id} onChange={(e) => setForm({ ...form, major_id: e.target.value })}>
              <option value="">Pilih Jurusan</option>
              {(meta.data?.majors ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Wali Kelas (opsional)">
            <select className="form-input" value={form.wali_teacher_id} onChange={(e) => setForm({ ...form, wali_teacher_id: e.target.value })}>
              <option value="">- Belum ditentukan -</option>
              {(meta.data?.teachers ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Tahun Ajaran" error={save.fieldErrors.year}><input className="form-input" placeholder="2026/2027" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></Field>
          <ModalActions onCancel={() => setModal(false)} onSave={submit} saving={save.saving} />
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Guru */
function Teachers() {
  const { data, loading, error, reload } = useApi<Teacher[]>("/teachers");
  const meta = useApi<Meta>("/meta");
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<Teacher | null>(null);
  const empty = { name: "", email: "", password: "", nip: "", subject: "", class_ids: [] as number[], status: "Aktif" };
  const [form, setForm] = useState(empty);
  const save = useSave();

  const openAdd = () => { setEdit(null); setForm(empty); save.reset(); setModal(true); };
  const openEdit = (t: Teacher) => { setEdit(t); setForm({ name: t.name, email: t.email, password: "", nip: t.nip ?? "", subject: t.subject ?? "", class_ids: t.class_ids, status: t.status }); save.reset(); setModal(true); };
  const toggleClass = (id: number) => setForm((f) => ({ ...f, class_ids: f.class_ids.includes(id) ? f.class_ids.filter((x) => x !== id) : [...f.class_ids, id] }));

  const submit = async () => {
    const ok = await save.run(() => edit ? api.put(`/admin/teachers/${edit.id}`, form) : api.post("/admin/teachers", form));
    if (ok) { setModal(false); reload(); meta.reload(); }
  };
  const remove = async (t: Teacher) => {
    if (!window.confirm(`Hapus guru "${t.name}"? Materi, asesmen, dan tugas miliknya ikut terhapus.`)) return;
    try { await api.del(`/admin/teachers/${t.id}`); reload(); meta.reload(); } catch (e) { window.alert(e instanceof Error ? e.message : "Gagal menghapus."); }
  };

  return (
    <div>
      <PageHeader title="Guru & Pelajaran" subtitle="Manajemen data guru, mata pelajaran, dan kelas yang diajar" action={<button className="btn-primary" onClick={openAdd}>+ Tambah Guru</button>} />
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <Table>
          <table>
            <thead><tr><th>Nama Guru</th><th>NIP</th><th>Mata Pelajaran</th><th>Kelas Diajar</th><th>Email</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {(data ?? []).map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500 }}>{t.name}</td>
                  <td style={{ fontFamily: "monospace", color: "#64748b", fontSize: "0.8125rem" }}>{t.nip ?? "-"}</td>
                  <td>{t.subject ?? "-"}</td>
                  <td style={{ maxWidth: 240 }}>{t.classes.length ? t.classes.map((c) => <span key={c.id} className="badge badge-blue" style={{ margin: "0 0.25rem 0.25rem 0" }}>{c.name}</span>) : <span style={{ color: "#94a3b8" }}>Belum ada</span>}</td>
                  <td style={{ color: "#64748b" }}>{t.email}</td>
                  <td><span className={`badge ${t.status === "Aktif" ? "badge-green" : "badge-slate"}`}>{t.status}</span></td>
                  <td style={{ display: "flex", gap: "0.375rem" }}>
                    <button className="btn-edit" onClick={() => openEdit(t)}>Edit</button>
                    <button className="btn-danger" onClick={() => remove(t)}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data ?? []).length === 0 && <Empty text="Belum ada guru." />}
        </Table>
      )}
      {modal && (
        <Modal title={edit ? "Edit Data Guru" : "Tambah Guru Baru"} onClose={() => setModal(false)} wide>
          <FormError message={save.error} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
            <Field label="Nama Lengkap" error={save.fieldErrors.name}><input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="NIP" error={save.fieldErrors.nip}><input className="form-input" value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} /></Field>
            <Field label="Email" error={save.fieldErrors.email}><input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label={edit ? "Password baru" : "Password"} error={save.fieldErrors.password} hint={edit ? "Kosongkan jika tidak diubah." : "Minimal 6 karakter."}>
              <input type="password" autoComplete="new-password" className="form-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <Field label="Mata Pelajaran" error={save.fieldErrors.subject} hint="Pilih dari daftar atau ketik mapel baru.">
              <input className="form-input" list="subject-list" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              <datalist id="subject-list">{(meta.data?.subjects ?? []).map((s) => <option key={s.id} value={s.name} />)}</datalist>
            </Field>
            {edit && (
              <Field label="Status">
                <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Aktif</option><option>Nonaktif</option></select>
              </Field>
            )}
          </div>
          <Field label="Kelas yang diajar" error={save.fieldErrors.class_ids}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.375rem", border: "1px solid #e2e8f0", borderRadius: "0.5rem", padding: "0.625rem" }}>
              {(meta.data?.classes ?? []).map((c) => (
                <label key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={form.class_ids.includes(c.id)} onChange={() => toggleClass(c.id)} /> {c.name}
                </label>
              ))}
            </div>
          </Field>
          <ModalActions onCancel={() => setModal(false)} onSave={submit} saving={save.saving} />
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Siswa */
function Students() {
  const { data, loading, error, reload } = useApi<Student[]>("/students");
  const meta = useApi<Meta>("/meta");
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<Student | null>(null);
  const [q, setQ] = useState("");
  const empty = { name: "", email: "", password: "", nis: "", class_id: "", status: "Aktif" };
  const [form, setForm] = useState(empty);
  const save = useSave();

  const openAdd = () => { setEdit(null); setForm(empty); save.reset(); setModal(true); };
  const openEdit = (s: Student) => { setEdit(s); setForm({ name: s.name, email: s.email, password: "", nis: s.nis ?? "", class_id: String(s.class_id ?? ""), status: s.status }); save.reset(); setModal(true); };

  const submit = async () => {
    const body = { ...form, class_id: form.class_id || null };
    const ok = await save.run(() => edit ? api.put(`/admin/students/${edit.id}`, body) : api.post("/admin/students", body));
    if (ok) { setModal(false); reload(); }
  };
  const remove = async (s: Student) => {
    if (!window.confirm(`Hapus siswa "${s.name}"? Nilai dan pengumpulan tugasnya ikut terhapus.`)) return;
    try { await api.del(`/admin/students/${s.id}`); reload(); } catch (e) { window.alert(e instanceof Error ? e.message : "Gagal menghapus."); }
  };

  const term = q.trim().toLowerCase();
  const rows = (data ?? []).filter((s) => !term || s.name.toLowerCase().includes(term) || (s.nis ?? "").toLowerCase().includes(term) || (s.class ?? "").toLowerCase().includes(term));

  return (
    <div>
      <PageHeader
        title="Data Siswa"
        subtitle="Seluruh data siswa"
        action={
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <input className="form-input" style={{ width: 220 }} placeholder="Cari nama / NIS / kelas..." value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn-primary" onClick={openAdd}>+ Tambah Siswa</button>
          </div>
        }
      />
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <Table>
          <table>
            <thead><tr><th>Nama Siswa</th><th>NIS</th><th>Kelas</th><th>Jurusan</th><th>Email</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.name}</td>
                  <td style={{ fontFamily: "monospace", color: "#64748b" }}>{s.nis ?? "-"}</td>
                  <td>{s.class ? <span className="badge badge-blue">{s.class}</span> : <span style={{ color: "#94a3b8" }}>-</span>}</td>
                  <td>{s.major ?? "-"}</td>
                  <td style={{ color: "#64748b" }}>{s.email}</td>
                  <td><span className={`badge ${s.status === "Aktif" ? "badge-green" : "badge-slate"}`}>{s.status}</span></td>
                  <td style={{ display: "flex", gap: "0.375rem" }}>
                    <button className="btn-edit" onClick={() => openEdit(s)}>Edit</button>
                    <button className="btn-danger" onClick={() => remove(s)}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <Empty text="Tidak ada data siswa." />}
        </Table>
      )}
      {modal && (
        <Modal title={edit ? "Edit Data Siswa" : "Tambah Siswa Baru"} onClose={() => setModal(false)}>
          <FormError message={save.error} />
          <Field label="Nama Lengkap" error={save.fieldErrors.name}><input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="NIS" error={save.fieldErrors.nis}><input className="form-input" value={form.nis} onChange={(e) => setForm({ ...form, nis: e.target.value })} /></Field>
          <Field label="Email" error={save.fieldErrors.email}><input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label={edit ? "Password baru" : "Password"} error={save.fieldErrors.password} hint={edit ? "Kosongkan jika tidak diubah." : "Minimal 6 karakter."}>
            <input type="password" autoComplete="new-password" className="form-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="Kelas" error={save.fieldErrors.class_id}>
            <select className="form-input" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
              <option value="">- Belum ada kelas -</option>
              {(meta.data?.classes ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          {edit && (
            <Field label="Status">
              <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Aktif</option><option>Nonaktif</option></select>
            </Field>
          )}
          <ModalActions onCancel={() => setModal(false)} onSave={submit} saving={save.saving} />
        </Modal>
      )}
    </div>
  );
}

export default function AdminDashboard({ page }: { page: string }) {
  switch (page) {
    case "dashboard": return <Overview />;
    case "accounts": return <Accounts />;
    case "classes": return <Classes />;
    case "teachers": return <Teachers />;
    case "students": return <Students />;
    default: return null;
  }
}
