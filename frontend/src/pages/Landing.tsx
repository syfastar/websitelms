interface LandingProps {
  onLogin: () => void;
}

const features = [
  { icon: "📚", title: "Materi Digital", desc: "Akses ratusan materi pelajaran kapan saja dan di mana saja dalam format PDF, video, dan presentasi interaktif." },
  { icon: "📝", title: "Asesmen Online", desc: "Ujian, kuis, dan ulangan harian secara online dengan koreksi otomatis dan hasil yang instan." },
  { icon: "📋", title: "Manajemen Tugas", desc: "Guru dapat memberikan tugas dan proyek, siswa mengumpulkan secara digital — efisien dan terstruktur." },
  { icon: "📊", title: "Laporan Nilai", desc: "Generate nilai per mata pelajaran secara otomatis, dapat dipantau oleh Kepsek dan Kurikulum." },
  { icon: "👥", title: "Multi-Role Akses", desc: "Lima peran: Admin, Guru, Siswa, Kurikulum, dan Kepala Sekolah dengan hak akses yang berbeda-beda." },
  { icon: "🔒", title: "Aman & Terpercaya", desc: "Sistem keamanan berlapis untuk melindungi data seluruh civitas akademika sekolah." },
];

const jurusan = [
  { kode: "DKV", nama: "Desain Komunikasi Visual", icon: "🎨", color: "#f59e0b" },
  { kode: "MPLB", nama: "Manajemen Perkantoran dan Layanan Bisnis", icon: "🗂️", color: "#8b5cf6" },
  { kode: "PPLG", nama: "Pengembangan Perangkat Lunak dan Gim", icon: "💻", color: "#3b82f6" },
  { kode: "TKJT", nama: "Teknik Jaringan Komputer dan Telekomunikasi", icon: "📡", color: "#10b981" },
  { kode: "BDP", nama: "Bisnis Daring dan Pemasaran", icon: "🛒", color: "#06b6d4" },
  { kode: "Perhotelan", nama: "Akomodasi Perhotelan", icon: "🏨", color: "#ef4444" },
];

export default function Landing({ onLogin }: LandingProps) {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Navbar */}
      <nav style={{ background: "white", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 40, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 1.5rem", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 38, height: 38, borderRadius: "0.625rem", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem" }}>🎓</div>
            <div>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "1.125rem", color: "#0f172a" }}>E-Learning </span>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "1.125rem", color: "#2563eb" }}>Lumora</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            {["Fitur", "Jurusan", "Tentang"].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} style={{ fontSize: "0.9rem", color: "#64748b", textDecoration: "none", fontWeight: 500, transition: "color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#2563eb")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
              >{item}</a>
            ))}
            <button onClick={onLogin} className="btn-primary" style={{ fontSize: "0.875rem" }}>Masuk</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%)", padding: "6rem 1.5rem 5rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -120, left: "10%", width: 400, height: 400, borderRadius: "50%", background: "rgba(59,130,246,0.1)" }} />
        <div style={{ position: "absolute", bottom: -80, right: "5%", width: 300, height: 300, borderRadius: "50%", background: "rgba(139,92,246,0.08)" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "9999px", padding: "0.375rem 1rem", marginBottom: "1.75rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#60a5fa", display: "inline-block" }} />
            <span style={{ fontSize: "0.8125rem", color: "#93c5fd", fontWeight: 500 }}>Platform Pembelajaran Digital SMK</span>
          </div>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 800, color: "white", lineHeight: 1.15, margin: "0 0 1.25rem" }}>
            Belajar Lebih Cerdas<br />dengan <span style={{ color: "#60a5fa" }}>E-Learning Lumora</span>
          </h1>
          <p style={{ fontSize: "1.0625rem", color: "#94a3b8", lineHeight: 1.7, marginBottom: "2.5rem", maxWidth: 560, margin: "0 auto 2.5rem" }}>
            Platform e-learning terpadu untuk siswa, guru, dan manajemen sekolah. Akses materi, kerjakan tugas, dan pantau perkembangan belajar kapan saja, di mana saja.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onLogin} style={{ background: "#2563eb", color: "white", border: "none", borderRadius: "0.625rem", padding: "0.875rem 2rem", fontSize: "1rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "background 0.15s", boxShadow: "0 8px 20px rgba(37,99,235,0.4)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#1d4ed8")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#2563eb")}>
              Mulai Belajar →
            </button>
            <button style={{ background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "0.625rem", padding: "0.875rem 2rem", fontSize: "1rem", fontWeight: 500, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              Pelajari Lebih Lanjut
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ maxWidth: 700, margin: "4rem auto 0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1px", background: "rgba(255,255,255,0.1)", borderRadius: "1rem", overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)" }}>
          {[
            ["200+", "Guru Pengajar"],
            ["3.000+", "Murid Aktif"],
            ["6", "Jurusan SMK"],
            ["50+", "Mata Pelajaran"],
          ].map(([num, label]) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.06)", padding: "1.5rem 1rem", textAlign: "center" }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "1.875rem", fontWeight: 800, color: "#60a5fa", lineHeight: 1 }}>{num}</div>
              <div style={{ fontSize: "0.8125rem", color: "#94a3b8", marginTop: "0.375rem" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="fitur" style={{ padding: "5rem 1.5rem", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{ display: "inline-block", background: "#eff6ff", color: "#2563eb", borderRadius: "9999px", padding: "0.375rem 1rem", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.75rem" }}>Fitur Unggulan</div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "2rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.75rem" }}>Semua yang Kamu Butuhkan</h2>
          <p style={{ color: "#64748b", fontSize: "1rem", maxWidth: 480, margin: "0 auto" }}>Platform lengkap yang dirancang khusus untuk ekosistem pendidikan kejuruan Indonesia</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem" }}>
          {features.map((f) => (
            <div key={f.title} style={{ background: "white", borderRadius: "0.875rem", padding: "1.5rem", border: "1px solid #e2e8f0", transition: "box-shadow 0.2s, transform 0.2s", cursor: "default" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
            >
              <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", marginBottom: "1rem" }}>{f.icon}</div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "1.0625rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.5rem" }}>{f.title}</h3>
              <p style={{ fontSize: "0.875rem", color: "#64748b", lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Jurusan */}
      <section id="jurusan" style={{ padding: "5rem 1.5rem", background: "white" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div style={{ display: "inline-block", background: "#f0fdf4", color: "#16a34a", borderRadius: "9999px", padding: "0.375rem 1rem", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.75rem" }}>6 Kompetensi Keahlian</div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "2rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.75rem" }}>Jurusan yang Tersedia</h2>
            <p style={{ color: "#64748b", fontSize: "1rem", maxWidth: 480, margin: "0 auto" }}>Pilih kompetensi keahlian yang sesuai dengan minat dan bakat kamu</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            {jurusan.map((j) => (
              <div key={j.kode} style={{ borderRadius: "0.875rem", padding: "1.5rem", border: `2px solid ${j.color}22`, background: `${j.color}08`, display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: `${j.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", flexShrink: 0 }}>{j.icon}</div>
                <div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "1.0625rem", color: "#0f172a" }}>{j.kode}</div>
                  <div style={{ fontSize: "0.8125rem", color: "#64748b", lineHeight: 1.5, marginTop: "0.25rem" }}>{j.nama}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About / CTA */}
      <section id="tentang" style={{ padding: "5rem 1.5rem", background: "linear-gradient(135deg, #0f172a, #1e3a8a)" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "2rem", fontWeight: 800, color: "white", margin: "0 0 1rem" }}>Tentang E-Learning Lumora</h2>
          <p style={{ color: "#94a3b8", fontSize: "1rem", lineHeight: 1.75, marginBottom: "1.5rem" }}>
            E-Learning Lumora adalah platform pembelajaran digital yang dirancang khusus untuk SMK. Kami percaya bahwa setiap siswa berhak mendapatkan akses pendidikan berkualitas, dan setiap guru layak mendapatkan alat yang memudahkan proses pengajaran.
          </p>
          <p style={{ color: "#94a3b8", fontSize: "1rem", lineHeight: 1.75, marginBottom: "2.5rem" }}>
            Dengan fitur manajemen kelas, asesmen digital, dan pelaporan nilai yang komprehensif, Lumora hadir sebagai mitra terpercaya dalam perjalanan belajar mengajar di era digital.
          </p>
          <button onClick={onLogin} style={{ background: "#2563eb", color: "white", border: "none", borderRadius: "0.625rem", padding: "0.875rem 2.5rem", fontSize: "1rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", boxShadow: "0 8px 20px rgba(37,99,235,0.4)" }}>
            Masuk ke Platform →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "#0f172a", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "2rem 1.5rem", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.625rem", marginBottom: "0.75rem" }}>
          <div style={{ width: 28, height: 28, borderRadius: "0.4rem", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>🎓</div>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: "white", fontSize: "0.9375rem" }}>E-Learning Lumora</span>
        </div>
        <p style={{ color: "#475569", fontSize: "0.8125rem", margin: 0 }}>© 2024 E-Learning Lumora · Platform Pendidikan Digital SMK</p>
      </footer>
    </div>
  );
}
