import { connectDB } from "@/lib/mongodb";
import { getCurrentSiswa } from "@/lib/currentSiswa";
import Tugas from "@/models/Tugas";
import Submission from "@/models/Submission";
import Topbar from "@/components/Topbar";
import TugasList from "@/components/TugasList";

export default async function TugasPage() {
  await connectDB();
  const siswa = await getCurrentSiswa();

  let tugasList = [];
  if (siswa) {
    const tugas = await Tugas.find({ kelas: siswa.kelas }).sort({ deadline: 1 }).lean();
    const submissions = await Submission.find({
      siswa: siswa._id,
      tugas: { $in: tugas.map((t) => t._id) },
    }).lean();
    const byTugas = Object.fromEntries(submissions.map((s) => [String(s.tugas), s]));

    tugasList = tugas.map((t) => {
      const sub = byTugas[String(t._id)];
      return {
        id: String(t._id),
        judul: t.judul,
        mataPelajaran: t.mataPelajaran,
        deadline: t.deadline,
        status: sub?.status || "Belum Dikumpulkan",
        nilai: sub?.nilai ?? null,
      };
    });
  }

  return (
    <div>
      <Topbar section="Assignments" siswa={siswa} />
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-1">Tugas Saya</h1>
        <p className="text-gray-500 mb-6">Kerjakan dan kumpulkan tugas tepat waktu</p>
        <TugasList initialTugas={tugasList} nis={siswa?.nis} />
      </div>
    </div>
  );
}
