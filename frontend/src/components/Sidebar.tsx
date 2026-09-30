import { useAuth, Role } from "../context/AuthContext";

interface NavItem {
  label: string;
  page: string;
  icon: string;
}

const navByRole: Record<Role, NavItem[]> = {
  admin: [
    { label: "Dashboard", page: "dashboard", icon: "⊞" },
    { label: "Manajemen Akun", page: "accounts", icon: "👥" },
    { label: "Kelas & Jurusan", page: "classes", icon: "🏫" },
    { label: "Guru & Pelajaran", page: "teachers", icon: "👨‍🏫" },
    { label: "Data Siswa", page: "students", icon: "🎓" },
  ],
  guru: [
    { label: "Dashboard", page: "dashboard", icon: "⊞" },
    { label: "Materi", page: "materials", icon: "📚" },
    { label: "Asesmen & Kuis", page: "assessments", icon: "📝" },
    { label: "Tugas & Proyek", page: "assignments", icon: "📋" },
    { label: "Generate Nilai", page: "grades", icon: "📊" },
    { label: "Data Siswa", page: "students", icon: "🎓" },
  ],
  siswa: [
    { label: "Dashboard", page: "dashboard", icon: "⊞" },
    { label: "Materi Pelajaran", page: "materials", icon: "📚" },
    { label: "Tugas Saya", page: "assignments", icon: "📋" },
    { label: "Ujian & Kuis", page: "exams", icon: "📝" },
  ],
  kurikulum: [
    { label: "Dashboard", page: "dashboard", icon: "⊞" },
    { label: "Nilai Per Mapel", page: "grades", icon: "📊" },
    { label: "Monitoring Tugas", page: "assignments", icon: "📋" },
    { label: "Pembuatan Soal", page: "assessments", icon: "📝" },
    { label: "Data Guru", page: "teachers", icon: "👨‍🏫" },
    { label: "Data Siswa", page: "students", icon: "🎓" },
  ],
  kepsek: [
    { label: "Dashboard", page: "dashboard", icon: "⊞" },
    { label: "Nilai Per Mapel", page: "grades", icon: "📊" },
    { label: "Monitoring Tugas", page: "assignments", icon: "📋" },
    { label: "Pembuatan Soal", page: "assessments", icon: "📝" },
    { label: "Data Guru", page: "teachers", icon: "👨‍🏫" },
    { label: "Data Siswa", page: "students", icon: "🎓" },
  ],
};

const roleLabels: Record<Role, string> = {
  admin: "Administrator",
  guru: "Guru",
  siswa: "Siswa",
  kurikulum: "Kurikulum",
  kepsek: "Kepala Sekolah",
};

const roleColors: Record<Role, string> = {
  admin: "#f59e0b",
  guru: "#3b82f6",
  siswa: "#10b981",
  kurikulum: "#8b5cf6",
  kepsek: "#ef4444",
};

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const nav = navByRole[user.role];
  const color = roleColors[user.role];

  return (
    <aside style={{ background: "#0f172a", width: "260px", minHeight: "100vh", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ padding: "1.5rem 1.25rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: 40, height: 40, borderRadius: "0.625rem", background: `linear-gradient(135deg, ${color}, ${color}99)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", flexShrink: 0 }}>
            🎓
          </div>
          <div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "0.9375rem", color: "white", lineHeight: 1.2 }}>E-Learning</div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: "0.75rem", color: color, lineHeight: 1.2 }}>Lumora</div>
          </div>
        </div>
      </div>

      {/* Role badge */}
      <div style={{ padding: "1rem 1.25rem 0.75rem" }}>
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "0.625rem", padding: "0.75rem", display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${color}22`, border: `2px solid ${color}66`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>
            {user.role === "admin" ? "👑" : user.role === "guru" ? "👨‍🏫" : user.role === "siswa" ? "🎒" : user.role === "kurikulum" ? "📐" : "🏫"}
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ color: "white", fontSize: "0.8125rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
            <div style={{ color: color, fontSize: "0.7rem", fontWeight: 500 }}>{roleLabels[user.role]}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0.5rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.125rem" }}>
        <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0.5rem 0.25rem", marginBottom: "0.25rem" }}>Menu</div>
        {nav.map((item) => (
          <button
            key={item.page}
            className={`sidebar-link${currentPage === item.page ? " active" : ""}`}
            onClick={() => onNavigate(item.page)}
          >
            <span style={{ fontSize: "1rem" }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <button
          className="sidebar-link"
          onClick={logout}
          style={{ color: "#f87171" }}
        >
          <span style={{ fontSize: "1rem" }}>🚪</span>
          Keluar
        </button>
      </div>
    </aside>
  );
}
