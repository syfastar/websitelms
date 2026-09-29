import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentSiswa } from "@/lib/currentSiswa";
import Materi from "@/models/Materi";
import Tugas from "@/models/Tugas";
import Submission from "@/models/Submission";
import Ujian from "@/models/Ujian";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const siswa = await getCurrentSiswa(searchParams.get("nis"));

  if (!siswa) {
    return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
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
  const submissionByTugas = Object.fromEntries(
    submissions.map((s) => [String(s.tugas), s])
  );

  const tugasTerbaru = tugasKelas.slice(0, 5).map((t) => {
    const sub = submissionByTugas[String(t._id)];
    return {
      id: String(t._id),
      judul: t.judul,
      deadline: t.deadline,
      status: sub?.status || "Belum Dikumpulkan",
      nilai: sub?.nilai ?? null,
    };
  });

  const tugasAktifCount = tugasTerbaru.filter(
    (t) => t.status !== "Sudah Dikumpulkan"
  ).length;

  const nilaiList = submissions
    .map((s) => s.nilai)
    .filter((n) => typeof n === "number");
  const rataRataNilai = nilaiList.length
    ? Math.round(
        (nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length) * 10
      ) / 10
    : null;

  const ujianList = ujianKelas.slice(0, 5).map((u) => ({
    id: String(u._id),
    judul: u.judul,
    tanggal: u.tanggal,
    status: new Date(u.tanggal) <= new Date() ? "Tersedia" : "Mendatang",
  }));

  return NextResponse.json({
    siswa: {
      nama: siswa.nama,
      nis: siswa.nis,
      kelas: siswa.kelas,
      jurusan: siswa.jurusan,
      status: siswa.status,
      semester: siswa.semester,
    },
    ringkasan: {
      materiTersedia: materiCount,
      tugasAktif: tugasAktifCount,
      ujianTersedia: ujianList.filter((u) => u.status === "Tersedia").length,
      rataRataNilai,
    },
    tugasTerbaru,
    ujian: ujianList,
  });
}
