import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { formatDate, num } from "../../lib/format";
import type { SubjectSummary } from "../../lib/types";
import { StudentsReadOnly, TeachersReadOnly } from "../../components/PeopleViews";
import { Empty, ErrorBox, Loading, PageHeader, Progress, StatCard } from "../../components/ui";

interface Props { page: string; role: "kurikulum" | "kepsek" }

const roleTitle = { kurikulum: "Kurikulum", kepsek: "Kepala Sekolah" };

interface Summary {
  stats: { average: number | null; active_assignments: number; total_assignments: number; teachers: number; students: number; academic_year: string | null };
  subjects: SubjectSummary[];
}
interface AssignmentRow { id: number; title: string; type: string; deadline: string; class: string; teacher: string; subject: string; submitted: number; total: number }
interface AssessmentRow { id: number; title: string; type: string; due_date: string; status: string; class: string; teacher: string; subject: string; questions: number }

const scoreColor = (v: number | null) => v === null ? "#94a3b8" : v >= 80 ? "#16a34a" : v >= 70 ? "#d97706" : "#dc2626";

function Overview({ role, name }: { role: Props["role"]; name: string }) {
  const { data, loading, error, reload } = useApi<Summary>("/monitor/summary");
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const s = data!.stats;
  const stats: [string, string, string | number, string][] = [
    ["📊", "Rata-rata Nilai", s.average === null ? "-" : num(s.average), "Hasil asesmen semua mapel"],
    ["📋", "Tugas Aktif", s.active_assignments, `${s.total_assignments} tugas total`],
    ["👨‍🏫", "Guru", s.teachers, "Mengajar"],
    ["🎓", "Siswa", s.students, s.academic_year ? `T.A. ${s.academic_year}` : "Terdaftar"],
  ];
  return (
    <div>
      <PageHeader title={`Dashboard ${roleTitle[role]}`} subtitle={`${name} · Monitoring & Evaluasi Pembelajaran`} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {stats.map(([icon, label, val, sub]) => <StatCard key={label} icon={icon} label={label} value={val} color={role === "kepsek" ? "#ef4444" : "#8b5cf6"} sub={sub} />)}
      </div>
      <SubjectTable subjects={data!.subjects} academicYear={s.academic_year} />
    </div>
  );
}

function SubjectTable({ subjects, academicYear }: { subjects: SubjectSummary[]; academicYear?: string | null }) {
  return (
    <div className="table-container">
      <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>Ringkasan Nilai Per Mata Pelajaran</div>
        {academicYear && <span className="badge badge-blue">T.A. {academicYear}</span>}
      </div>
      <table>
        <thead><tr><th>Mata Pelajaran</th><th>Guru</th><th>Rata-rata</th><th>Tertinggi</th><th>Terendah</th><th>Lulus (%)</th></tr></thead>
        <tbody>
          {subjects.map((g, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 500 }}>{g.subject}</td>
              <td style={{ color: "#64748b" }}>{g.teacher}</td>
              <td style={{ fontWeight: 600, color: scoreColor(g.avg) }}>{num(g.avg)}</td>
              <td>{num(g.highest)}</td>
              <td>{num(g.lowest)}</td>
              <td>{g.pass === null ? "-" : <Progress value={g.pass} total={100} color="#10b981" width={60} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {subjects.length === 0 && <Empty text="Belum ada data nilai." />}
    </div>
  );
}

function Grades() {
  const { data, loading, error, reload } = useApi<SubjectSummary[]>("/monitor/grades");
  return (
    <div>
      <PageHeader title="Nilai Per Mata Pelajaran" subtitle="Rekapitulasi hasil asesmen semua mata pelajaran" />
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
            {(data ?? []).map((g, i) => (
              <div key={i} className="stat-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{g.subject}</div>
                  <span className={`badge ${g.avg === null ? "badge-slate" : g.avg >= 80 ? "badge-green" : g.avg >= 70 ? "badge-amber" : "badge-red"}`}>{g.avg === null ? "Belum ada" : g.avg >= 80 ? "Baik" : g.avg >= 70 ? "Cukup" : "Kurang"}</span>
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#64748b", marginBottom: "0.75rem" }}>{g.teacher} · {g.count} hasil</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", textAlign: "center" }}>
                  {[["Avg", g.avg], ["Max", g.highest], ["Min", g.lowest]].map(([lbl, val]) => (
                    <div key={String(lbl)} style={{ background: "#f8fafc", borderRadius: "0.5rem", padding: "0.5rem" }}>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1e40af" }}>{num(val as number | null)}</div>
                      <div style={{ fontSize: "0.6875rem", color: "#94a3b8" }}>{lbl}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {(data ?? []).length === 0 && <Empty text="Belum ada data nilai." />}
        </>
      )}
    </div>
  );
}

function AssignmentsMon() {
  const { data, loading, error, reload } = useApi<AssignmentRow[]>("/monitor/assignments");
  return (
    <div>
      <PageHeader title="Monitoring Tugas" subtitle="Pantau tugas yang diberikan guru kepada siswa" />
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <div className="table-container">
          <table>
            <thead><tr><th>Judul Tugas</th><th>Guru</th><th>Kelas</th><th>Tipe</th><th>Deadline</th><th>Progress</th></tr></thead>
            <tbody>
              {(data ?? []).map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 500 }}>{a.title}</td>
                  <td style={{ color: "#64748b" }}>{a.teacher}</td>
                  <td><span className="badge badge-blue">{a.class}</span></td>
                  <td><span className="badge badge-amber">{a.type}</span></td>
                  <td style={{ color: "#64748b" }}>{formatDate(a.deadline)}</td>
                  <td><Progress value={a.submitted} total={a.total} width={80} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data ?? []).length === 0 && <Empty text="Belum ada tugas." />}
        </div>
      )}
    </div>
  );
}

function AssessmentsMon() {
  const { data, loading, error, reload } = useApi<AssessmentRow[]>("/monitor/assessments");
  return (
    <div>
      <PageHeader title="Pembuatan Soal Ulangan" subtitle="Monitor guru yang membuat soal ujian dan ulangan" />
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <div className="table-container">
          <table>
            <thead><tr><th>Judul Soal</th><th>Pembuat</th><th>Tipe</th><th>Kelas</th><th>Batas Akhir</th><th>Jumlah Soal</th><th>Status</th></tr></thead>
            <tbody>
              {(data ?? []).map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 500 }}>{a.title}</td>
                  <td style={{ color: "#64748b" }}>{a.teacher}</td>
                  <td><span className="badge badge-purple">{a.type}</span></td>
                  <td><span className="badge badge-blue">{a.class}</span></td>
                  <td style={{ color: "#64748b" }}>{formatDate(a.due_date)}</td>
                  <td>{a.questions} soal</td>
                  <td><span className={`badge ${a.status === "Aktif" ? "badge-green" : "badge-slate"}`}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data ?? []).length === 0 && <Empty text="Belum ada asesmen." />}
        </div>
      )}
    </div>
  );
}


export default function MonitoringDashboard({ page, role }: Props) {
  const { user } = useAuth();
  switch (page) {
    case "dashboard": return <Overview role={role} name={user?.name ?? ""} />;
    case "grades": return <Grades />;
    case "assignments": return <AssignmentsMon />;
    case "assessments": return <AssessmentsMon />;
    case "teachers": return <TeachersReadOnly />;
    case "students": return <StudentsReadOnly subtitle="Daftar seluruh siswa" />;
    default: return null;
  }
}
