import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import type { Role } from "./context/AuthContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Sidebar from "./components/Sidebar";
import AdminDashboard from "./pages/admin/AdminDashboard";
import GuruDashboard from "./pages/guru/GuruDashboard";
import SiswaDashboard from "./pages/siswa/SiswaDashboard";
import MonitoringDashboard from "./pages/shared/MonitoringDashboard";

function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [view, setView] = useState<"landing" | "login">("landing");

  // Kembali ke dashboard setiap kali user berganti (login / logout)
  useEffect(() => { setPage("dashboard"); }, [user?.email]);

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontFamily: "'Inter', sans-serif" }}>Memuat sesi...</div>;
  if (!user && view === "landing") return <Landing onLogin={() => setView("login")} />;
  if (!user && view === "login") return <Login onBack={() => setView("landing")} />;

  const roleColors: Record<Role, string> = {
    admin: "#f59e0b",
    guru: "#3b82f6",
    siswa: "#10b981",
    kurikulum: "#8b5cf6",
    kepsek: "#ef4444",
  };

  const renderContent = () => {
    switch (user!.role) {
      case "admin": return <AdminDashboard page={page} />;
      case "guru": return <GuruDashboard page={page} />;
      case "siswa": return <SiswaDashboard page={page} />;
      case "kurikulum": return <MonitoringDashboard page={page} role="kurikulum" />;
      case "kepsek": return <MonitoringDashboard page={page} role="kepsek" />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <Sidebar currentPage={page} onNavigate={setPage} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <header style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "0 1.5rem", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontSize: "0.875rem", color: "#64748b" }}>
            <span style={{ color: "#94a3b8" }}>E-Learning Lumora</span>
            <span style={{ margin: "0 0.5rem", color: "#cbd5e1" }}>/</span>
            <span style={{ color: "#334155", fontWeight: 500, textTransform: "capitalize" }}>{page}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ position: "relative" }}>
              <button style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "0.5rem", padding: "0.375rem 0.625rem", cursor: "pointer", fontSize: "1rem" }}>🔔</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0.625rem", padding: "0.375rem 0.75rem" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${roleColors[user!.role]}22`, border: `2px solid ${roleColors[user!.role]}66`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.875rem" }}>
                {user!.role === "admin" ? "👑" : user!.role === "guru" ? "👨‍🏫" : user!.role === "siswa" ? "🎒" : user!.role === "kurikulum" ? "📐" : "🏫"}
              </div>
              <div>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#334155", lineHeight: 1.2 }}>{user!.name}</div>
                <div style={{ fontSize: "0.6875rem", color: roleColors[user!.role], fontWeight: 500, textTransform: "capitalize" }}>{user!.role}</div>
              </div>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflow: "auto", padding: "1.5rem" }}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
