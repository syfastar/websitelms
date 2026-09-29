import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentSiswa } from "@/lib/currentSiswa";
import Ujian from "@/models/Ujian";
import Soal from "@/models/Soal";
import HasilUjian from "@/models/HasilUjian";

export async function GET(request, { params }) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const siswa = await getCurrentSiswa(searchParams.get("nis"));
  if (!siswa) {
    return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
  }

  const ujian = await Ujian.findOne({ _id: params.id, kelas: siswa.kelas }).lean();
  if (!ujian) {
    return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 });
  }

  const status = new Date(ujian.tanggal) <= new Date() ? "Tersedia" : "Mendatang";
  const hasil = await HasilUjian.findOne({ ujian: ujian._id, siswa: siswa._id }).lean();

  if (hasil) {
    return NextResponse.json({
      ujian: { id: String(ujian._id), judul: ujian.judul, mataPelajaran: ujian.mataPelajaran },
      status,
      sudahDikerjakan: true,
      hasil: {
        skor: hasil.skor,
        jumlahBenar: hasil.jumlahBenar,
        jumlahSoal: hasil.jumlahSoal,
      },
    });
  }

  if (status !== "Tersedia") {
    return NextResponse.json({
      ujian: { id: String(ujian._id), judul: ujian.judul, mataPelajaran: ujian.mataPelajaran },
      status,
      sudahDikerjakan: false,
      soal: [],
    });
  }

  const soalDocs = await Soal.find({ ujian: ujian._id }).sort({ urutan: 1 }).lean();

  return NextResponse.json({
    ujian: {
      id: String(ujian._id),
      judul: ujian.judul,
      mataPelajaran: ujian.mataPelajaran,
      durasiMenit: ujian.durasiMenit,
    },
    status,
    sudahDikerjakan: false,
    // jawabanBenar sengaja tidak dikirim ke client
    soal: soalDocs.map((s) => ({
      id: String(s._id),
      pertanyaan: s.pertanyaan,
      pilihan: s.pilihan,
    })),
  });
}
