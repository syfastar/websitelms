import { connectDB } from "@/lib/mongodb";
import { getCurrentSiswa } from "@/lib/currentSiswa";
import Materi from "@/models/Materi";
import Tugas from "@/models/Tugas";
import Submission from "@/models/Submission";
import Ujian from "@/models/Ujian";
import Topbar from "@/components/Topbar";

function formatTanggal(date) {
  return new Date(date).toLocaleDateString("sv-SE"); // yyyy-mm-dd, singkat seperti di desain
}

const statusStyle = {
  "Belum Dikumpulkan": "bg-status-pending/10 text-status-pending",
  "Sedang Dikerjakan": "bg-status-progress/10 text-status-progress",
  "Sudah Dikumpulkan": "bg-status-done/10 text-status-done",
  Tersedia: "bg-status-done/10 text-status-done",
  Mendatang: "bg-gray-200 text-gray-600",
};

export default async function DashboardPage() {
  await connectDB();
  const siswa = await getCurrentSiswa();

  if (!siswa) {
    return (
      <div className="p-8">
        Data siswa demo belum ada. Jalankan{" "}
        <code className="bg-gray-100 px-1 rounded">npm run seed</code> dulu.
      </div>
    );
  }

  const [materiCount, tugasKelas, ujianKelas] = await Promise.all([
    Materi.countDocuments({ kelas: siswa.kelas }),
    Tugas.find({ kelas: siswa.kelas }).sort({ deadline: 1 }).lean(),
    Ujian.find({ kelas: siswa.kelas }).sort({ tanggal: 1 }).lean(),
  ]);

  const submissions = await Submission.find({
    siswa: siswa._id,
    tugas: { $in: tugasKelas.map((t) => t._id) },
  }).lean();
  const byTugas = Object.fromEntries(submissions.map((s) => [String(s.tugas), s]));

  const tugasTerbaru = tugasKelas.slice(0, 5).map((t) => {
    const sub = byTugas[String(t._id)];
    return {
      id: String(t._id),
      judul: t.judul,
      deadline: t.deadline,
      status: sub?.status || "Belum Dikumpulkan",
    };
  });
  const tugasAktif = tugasTerbaru.filter((t) => t.status !== "Sudah Dikumpulkan").length;

  const nilaiList = submissions.map((s) => s.nilai).filter((n) => typeof n === "number");
  const rataRata = nilaiList.length
    ? Math.round((nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length) * 10) / 10
    : "-";

  const ujianList = ujianKelas.slice(0, 5).map((u) => ({
    id: String(u._id),
    judul: u.judul,
    tanggal: u.tanggal,
    status: new Date(u.tanggal) <= new Date() ? "Tersedia" : "Mendatang",
  }));
  const ujianTersedia = ujianList.filter((u) => u.status === "Tersedia").length;

  const cards = [
    { label: "Materi Tersedia", value: materiCount, hint: "Siap diunduh", icon: "📚" },
    { label: "Tugas Aktif", value: tugasAktif, hint: "Perlu diselesaikan", icon: "📋" },
    { label: "Ujian Tersedia", value: ujianTersedia, hint: "Siap dikerjakan", icon: "📝" },
    { label: "Rata-rata Nilai", value: rataRata, hint: "Semester ini", icon: "⭐" },
  ];

  return (
    <div>
      <Topbar section="Dashboard" siswa={siswa} />
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-1">Dashboard Siswa</h1>
        <p className="text-gray-500 mb-6">
          {siswa.nama} · {siswa.kelas} · NIS: {siswa.nis} · {siswa.jurusan}
        </p>

        <div className="rounded-xl bg-sidebar text-white px-6 py-5 flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-brand/30 flex items-center justify-center text-xl">
              🎒
            </div>
            <div>
              <p className="font-semibold">{siswa.nama}</p>
              <p className="text-sm text-white/60">
                NIS: {siswa.nis} · {siswa.kelas}
              </p>
            </div>
          </div>
          <div className="flex gap-8 text-sm">
            <div>
              <p className="text-brand font-semibold">{siswa.jurusan}</p>
              <p className="text-white/50">Jurusan</p>
            </div>
            <div>
              <p className="text-brand font-semibold">{siswa.status}</p>
              <p className="text-white/50">Status</p>
            </div>
            <div>
              <p className="text-brand font-semibold">{siswa.semester}</p>
              <p className="text-white/50">Semester</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {cards.map((c) => (
            <div key={c.label} className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <span>{c.icon}</span> {c.label}
              </div>
              <p className="text-2xl font-semibold">{c.value}</p>
              <p className="text-xs text-gray-400">{c.hint}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border">
            <p className="font-semibold px-4 py-3 border-b">Tugas Terbaru</p>
            <table className="w-full text-sm">
              <thead className="text-gray-400 text-xs">
                <tr>
                  <th className="text-left font-normal px-4 py-2">TUGAS</th>
                  <th className="text-left font-normal px-4 py-2">DEADLINE</th>
                  <th className="text-left font-normal px-4 py-2">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {tugasTerbaru.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="px-4 py-3">{t.judul}</td>
                    <td className="px-4 py-3 text-gray-500">{formatTanggal(t.deadline)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusStyle[t.status]}`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {tugasTerbaru.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                      Belum ada tugas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border">
            <p className="font-semibold px-4 py-3 border-b">Ujian & Kuis</p>
            <table className="w-full text-sm">
              <thead className="text-gray-400 text-xs">
                <tr>
                  <th className="text-left font-normal px-4 py-2">UJIAN</th>
                  <th className="text-left font-normal px-4 py-2">TANGGAL</th>
                  <th className="text-left font-normal px-4 py-2">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {ujianList.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-4 py-3">{u.judul}</td>
                    <td className="px-4 py-3 text-gray-500">{formatTanggal(u.tanggal)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusStyle[u.status]}`}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {ujianList.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                      Belum ada ujian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
