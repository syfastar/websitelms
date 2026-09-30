import { useMemo, useState } from "react";
import { useApi } from "../hooks/useApi";
import type { Student, Teacher } from "../lib/types";
import { Empty, ErrorBox, Loading, PageHeader } from "./ui";

/** Daftar siswa (read-only) - dipakai Guru, Kurikulum, Kepsek. */
export function StudentsReadOnly({ subtitle }: { subtitle: string }) {
  const { data, loading, error, reload } = useApi<Student[]>("/students");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter((s) => !term || s.name.toLowerCase().includes(term) || (s.nis ?? "").toLowerCase().includes(term) || (s.class ?? "").toLowerCase().includes(term));
  }, [data, q]);

  return (
    <div>
      <PageHeader
        title="Data Siswa"
        subtitle={subtitle}
        action={<input className="form-input" style={{ width: 240 }} placeholder="Cari nama / NIS / kelas..." value={q} onChange={(e) => setQ(e.target.value)} />}
      />
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <div className="table-container">
          <table>
            <thead><tr><th>Nama Siswa</th><th>NIS</th><th>Kelas</th><th>Jurusan</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.name}</td>
                  <td style={{ fontFamily: "monospace", color: "#64748b" }}>{s.nis ?? "-"}</td>
                  <td>{s.class ? <span className="badge badge-blue">{s.class}</span> : "-"}</td>
                  <td>{s.major ?? "-"}</td>
                  <td><span className={`badge ${s.status === "Aktif" ? "badge-green" : "badge-slate"}`}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <Empty text="Belum ada data siswa." />}
        </div>
      )}
    </div>
  );
}

/** Daftar guru (read-only) - dipakai Kurikulum & Kepsek. */
export function TeachersReadOnly() {
  const { data, loading, error, reload } = useApi<Teacher[]>("/teachers");
  return (
    <div>
      <PageHeader title="Data Guru" subtitle="Daftar seluruh guru pengajar" />
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <div className="table-container">
          <table>
            <thead><tr><th>Nama Guru</th><th>NIP</th><th>Mata Pelajaran</th><th>Kelas</th><th>Email</th><th>Status</th></tr></thead>
            <tbody>
              {(data ?? []).map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500 }}>{t.name}</td>
                  <td style={{ fontFamily: "monospace", color: "#64748b", fontSize: "0.8125rem" }}>{t.nip ?? "-"}</td>
                  <td>{t.subject ?? "-"}</td>
                  <td style={{ maxWidth: 260 }}>{t.classes.length ? t.classes.map((c) => <span key={c.id} className="badge badge-blue" style={{ margin: "0 0.25rem 0.25rem 0" }}>{c.name}</span>) : "-"}</td>
                  <td style={{ color: "#64748b" }}>{t.email}</td>
                  <td><span className={`badge ${t.status === "Aktif" ? "badge-green" : "badge-slate"}`}>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data ?? []).length === 0 && <Empty text="Belum ada data guru." />}
        </div>
      )}
    </div>
  );
}
