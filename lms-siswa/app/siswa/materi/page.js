import { connectDB } from "@/lib/mongodb";
import { getCurrentSiswa } from "@/lib/currentSiswa";
import Materi from "@/models/Materi";
import Topbar from "@/components/Topbar";

function formatTanggal(date) {
  return new Date(date).toLocaleDateString("sv-SE");
}

export default async function MateriPage() {
  await connectDB();
  const siswa = await getCurrentSiswa();
  const materi = siswa
    ? await Materi.find({ kelas: siswa.kelas }).sort({ tanggalUpload: -1 }).lean()
    : [];

  return (
    <div>
      <Topbar section="Materials" siswa={siswa} />
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-1">Materi Pelajaran</h1>
        <p className="text-gray-500 mb-6">Download dan akses materi dari guru Anda</p>

        <div className="grid md:grid-cols-2 gap-4">
          {materi.map((m) => (
            <div
              key={m._id}
              className="bg-white rounded-xl border p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center text-lg shrink-0">
                  📄
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{m.judul}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {m.mataPelajaran} · {m.kelas}
                  </p>
                  <p className="text-xs text-gray-400">
                    {m.ukuranFile} · {formatTanggal(m.tanggalUpload)}
                  </p>
                </div>
              </div>
              <a
                href={m.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 bg-brand text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-dark"
              >
                ↓ Unduh
              </a>
            </div>
          ))}
          {materi.length === 0 && (
            <p className="text-gray-400 col-span-2">Belum ada materi untuk kelasmu.</p>
          )}
        </div>
      </div>
    </div>
  );
}
