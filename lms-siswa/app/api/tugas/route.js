import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentSiswa } from "@/lib/currentSiswa";
import Tugas from "@/models/Tugas";
import Submission from "@/models/Submission";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const siswa = await getCurrentSiswa(searchParams.get("nis"));
  if (!siswa) {
    return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
  }

  const tugas = await Tugas.find({ kelas: siswa.kelas })
    .sort({ deadline: 1 })
    .lean();
  const submissions = await Submission.find({
    siswa: siswa._id,
    tugas: { $in: tugas.map((t) => t._id) },
  }).lean();
  const byTugas = Object.fromEntries(submissions.map((s) => [String(s.tugas), s]));

  return NextResponse.json(
    tugas.map((t) => {
      const sub = byTugas[String(t._id)];
      return {
        id: String(t._id),
        judul: t.judul,
        mataPelajaran: t.mataPelajaran,
        deadline: t.deadline,
        status: sub?.status || "Belum Dikumpulkan",
        nilai: sub?.nilai ?? null,
      };
    })
  );
}
