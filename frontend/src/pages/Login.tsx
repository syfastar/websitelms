import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { studentAccounts } from "../data/demoAccounts";

type RoleTab = "admin" | "guru" | "siswa" | "kurikulum" | "kepsek";

const roleTabs: { id: RoleTab; label: string; icon: string; color: string; desc: string }[] = [
  { id: "admin", label: "Admin", desc: "Manajemen keseluruhan sistem", icon: "👑", color: "#f59e0b" },
  { id: "guru", label: "Guru", desc: "Kelola materi, tugas & penilaian", icon: "👨‍🏫", color: "#3b82f6" },
  { id: "siswa", label: "Siswa", desc: "Akses materi, tugas & ujian", icon: "🎒", color: "#10b981" },
  { id: "kurikulum", label: "Kurikulum", desc: "Monitoring nilai & pembelajaran", icon: "📐", color: "#8b5cf6" },
  { id: "kepsek", label: "Kepsek", desc: "Pemantauan kinerja sekolah", icon: "🏫", color: "#ef4444" },
];

const staffDefaults: Record<Exclude<RoleTab, "siswa">, { email: string; password: string }> = {
  admin: { email: "admin@lumora.sch.id", password: "admin123" },
  guru: { email: "siti@lumora.sch.id", password: "guru123" },
  kurikulum: { email: "kurikulum@lumora.sch.id", password: "kuri123" },
  kepsek: { email: "kepsek@lumora.sch.id", password: "kepsek123" },
};

interface LoginProps {
  onBack: () => void;
}

export default function Login({ onBack }: LoginProps) {
  const { loginWithEmail } = useAuth();
  const [selectedRole, setSelectedRole] = useState<RoleTab>("admin");
  const [email, setEmail] = useState(staffDefaults.admin.email);
  const [password, setPassword] = useState(staffDefaults.admin.password);
  const [selectedStudent, setSelectedStudent] = useState(studentAccounts[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRoleSelect = (role: RoleTab) => {
    setSelectedRole(role);
    setError("");
    if (role !== "siswa") {
      const def = staffDefaults[role as Exclude<RoleTab, "siswa">];
      setEmail(def.email);
      setPassword(def.password);
    } else {
      setEmail(studentAccounts[0].email);
      setPassword(studentAccounts[0].password);
      setSelectedStudent(studentAccounts[0]);
    }
  };

  const handleStudentPick = (acc: typeof studentAccounts[0]) => {
    setSelectedStudent(acc);
    setEmail(acc.email);
    setPassword(acc.password);
    setError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const err = await loginWithEmail(email, password);
    if (err) setError(err);
    setLoading(false);
  };

  const activeTab = roleTabs.find((r) => r.id === selectedRole)!;

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#0f172a", fontFamily: "'Inter', sans-serif" }}>
      {/* Left panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "3rem", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #1e3a8a 0%, #0f172a 60%)", zIndex: 0 }} />
        <div style={{ position: "absolute", top: -100, left: -100, width: 400, height: 400, borderRadius: "50%", background: "rgba(59,130,246,0.08)", zIndex: 0 }} />
        <div style={{ position: "absolute", bottom: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "rgba(139,92,246,0.06)", zIndex: 0 }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 420, width: "100%" }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#94a3b8", borderRadius: "0.5rem", padding: "0.375rem 0.875rem", fontSize: "0.8125rem", cursor: "pointer", marginBottom: "2rem", fontFamily: "'Inter', sans-serif" }}>
            ← Kembali ke Beranda
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2.5rem" }}>
            <div style={{ width: 56, height: 56, borderRadius: "1rem", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem", boxShadow: "0 8px 20px rgba(37,99,235,0.4)" }}>🎓</div>
            <div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "1.375rem", fontWeight: 800, color: "white", lineHeight: 1.2 }}>E-Learning</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "0.9375rem", fontWeight: 600, color: "#60a5fa", lineHeight: 1.2 }}>Lumora</div>
            </div>
          </div>
          <div style={{ color: "white", fontFamily: "'Outfit', sans-serif", fontSize: "1.875rem", fontWeight: 800, marginBottom: "0.5rem" }}>Selamat Datang!</div>
          <div style={{ color: "#94a3b8", fontSize: "0.9375rem", marginBottom: "2rem" }}>Platform pembelajaran digital terpadu untuk SMK</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            {[["200+", "Guru Pengajar"], ["3.000+", "Murid Aktif"], ["6", "Jurusan SMK"]].map(([num, label]) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.06)", borderRadius: "0.75rem", padding: "1rem", textAlign: "center", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "1.375rem", fontWeight: 700, color: "#60a5fa" }}>{num}</div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.25rem" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Student quick-pick shown on left when siswa tab active */}
          {selectedRole === "siswa" && (
            <div style={{ marginTop: "2rem", background: "rgba(255,255,255,0.05)", borderRadius: "0.875rem", padding: "1rem", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.625rem" }}>Demo Akun Siswa</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                {studentAccounts.map((acc) => (
                  <button key={acc.email} onClick={() => handleStudentPick(acc)}
                    style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: `1px solid ${selectedStudent.email === acc.email ? "#10b981" : "rgba(255,255,255,0.08)"}`, background: selectedStudent.email === acc.email ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)", cursor: "pointer", textAlign: "left" }}>
                    <span style={{ fontSize: "1rem" }}>🎒</span>
                    <div>
                      <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: selectedStudent.email === acc.email ? "#34d399" : "#cbd5e1" }}>{acc.user.name}</div>
                      <div style={{ fontSize: "0.6875rem", color: "#64748b" }}>{acc.user.student?.majorCode} · {acc.user.student?.class}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width: 480, display: "flex", alignItems: "center", justifyContent: "center", padding: "2.5rem", background: "#f8fafc" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.375rem" }}>Masuk ke Akun</h2>
            <p style={{ color: "#64748b", fontSize: "0.875rem", margin: 0 }}>Pilih role dan masukkan kredensial Anda</p>
          </div>

          {/* Role selector */}
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.8125rem", fontWeight: 500, color: "#475569", marginBottom: "0.625rem" }}>Pilih Role</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              {roleTabs.map((r) => (
                <button key={r.id} onClick={() => handleRoleSelect(r.id)}
                  style={{ padding: "0.625rem 0.75rem", borderRadius: "0.625rem", border: `2px solid ${selectedRole === r.id ? r.color : "#e2e8f0"}`, background: selectedRole === r.id ? `${r.color}11` : "white", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", transition: "all 0.15s", textAlign: "left" }}>
                  <span style={{ fontSize: "1.125rem" }}>{r.icon}</span>
                  <div>
                    <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: selectedRole === r.id ? r.color : "#334155" }}>{r.label}</div>
                    <div style={{ fontSize: "0.6875rem", color: "#94a3b8", lineHeight: 1.3 }}>{r.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* If siswa: show student selector inside form area too */}
          {selectedRole === "siswa" && (
            <div style={{ marginBottom: "1.25rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "0.625rem", padding: "0.875rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#16a34a", marginBottom: "0.5rem" }}>Siswa yang dipilih:</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.125rem" }}>🎒</div>
                <div>
                  <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.875rem" }}>{selectedStudent.user.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{selectedStudent.user.student?.class} · {selectedStudent.user.student?.major}</div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Anda" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password Anda" />
            </div>
            {error && <div style={{ background: "#fee2e2", color: "#dc2626", padding: "0.75rem", borderRadius: "0.5rem", fontSize: "0.8125rem", marginBottom: "1rem" }}>{error}</div>}
            <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "0.5rem", padding: "0.625rem 0.75rem", marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.75rem", color: "#0369a1", fontWeight: 500 }}>
                {selectedRole === "siswa" ? "💡 Klik nama siswa di panel kiri untuk ganti akun" : "💡 Klik role di atas untuk mengisi otomatis"}
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={loading}
              style={{ width: "100%", justifyContent: "center", padding: "0.75rem", fontSize: "0.9375rem", fontWeight: 600, background: activeTab.color, opacity: loading ? 0.8 : 1 }}>
              {loading ? "Memproses..." : `Masuk sebagai ${activeTab.label}`}
            </button>
          </form>
          <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.8125rem", color: "#94a3b8" }}>© 2024 E-Learning Lumora · All rights reserved</div>
        </div>
      </div>
    </div>
  );
}
