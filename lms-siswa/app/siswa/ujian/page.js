import { connectDB } from "@/lib/mongodb";
import { getCurrentSiswa } from "@/lib/currentSiswa";
import Ujian from "@/models/Ujian";
import HasilUjian from "@/models/HasilUjian";
import Topbar from "@/components/Topbar";
import Link from "next/link";

function formatTanggal(date) {
  return new Date(date).toLocaleDateString("sv-SE");
}

export default async function UjianPage() {
  await connectDB();
  const siswa = await getCurrentSiswa();
  const ujianDocs = siswa
    ? await Ujian.find({ kelas: siswa.kelas }).sort({ tanggal: 1 }).lean()
    : [];

  const hasilDocs = siswa
    ? await HasilUjian.find({
        siswa: siswa._id,
        ujian: { $in: ujianDocs.map((u) => u._id) },
      }).lean()
    : [];
  const hasilByUjian = Object.fromEntries(hasilDocs.map((h) => [String(h.ujian), h]));

  const ujian = ujianDocs.map((u) => ({
    id: String(u._id),
    judul: u.judul,
    mataPelajaran: u.mataPelajaran,
    tanggal: u.tanggal,
    durasiMenit: u.durasiMenit,
    jumlahSoal: u.jumlahSoal,
    status: new Date(u.tanggal) <= new Date() ? "Tersedia" : "Mendatang",
    hasil: hasilByUjian[String(u._id)] || null,
  }));

  return (
    <div>
      <Topbar section="Exams" siswa={siswa} />
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-1">Ujian & Kuis</h1>
        <p className="text-gray-500 mb-6">Kerjakan ujian dan kuis yang tersedia</p>

        <div className="space-y-4">
          {ujian.map((u) => (
            <div
              key={u.id}
              className="bg-white rounded-xl border p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center text-lg shrink-0">
                  📝
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{u.judul}</p>
                  <p className="text-xs text-gray-500">
                    {u.mataPelajaran} · {formatTanggal(u.tanggal)} · {u.durasiMenit} menit ·{" "}
                    {u.jumlahSoal} soal
                  </p>
                  {u.hasil && (
                    <p className="text-xs text-status-done font-medium">
                      Nilai: {u.hasil.skor}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    u.status === "Tersedia"
                      ? "bg-status-done/10 text-status-done"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {u.status}
                </span>
                {u.hasil ? (
                  <Link
                    href={`/siswa/ujian/${u.id}`}
                    className="bg-gray-100 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-200"
                  >
                    Lihat Hasil
                  </Link>
                ) : u.status === "Tersedia" ? (
                  <Link
                    href={`/siswa/ujian/${u.id}`}
                    className="bg-brand text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-dark"
                  >
                    Mulai Ujian
                  </Link>
                ) : (
                  <button
                    disabled
                    className="bg-gray-200 text-gray-400 text-sm px-4 py-2 rounded-lg cursor-not-allowed"
                  >
                    Mulai Ujian
                  </button>
                )}
              </div>
            </div>
          ))}
          {ujian.length === 0 && (
            <p className="text-gray-400">Belum ada ujian untuk kelasmu.</p>
          )}
        </div>
      </div>
    </div>
  );
}
