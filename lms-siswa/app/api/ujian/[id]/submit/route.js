import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentSiswa } from "@/lib/currentSiswa";
import Ujian from "@/models/Ujian";
import Soal from "@/models/Soal";
import HasilUjian from "@/models/HasilUjian";

export async function POST(request, { params }) {
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

  const existing = await HasilUjian.findOne({ ujian: ujian._id, siswa: siswa._id });
  if (existing) {
    return NextResponse.json(
      { error: "Ujian ini sudah pernah dikerjakan" },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const jawabanSiswa = body.jawaban || {}; // { [soalId]: pilihanIndex }

  // Penilaian dihitung di server memakai jawabanBenar dari database,
  // supaya jawaban benar tidak pernah dikirim ke browser.
  const soalDocs = await Soal.find({ ujian: ujian._id }).lean();

  let jumlahBenar = 0;
  const jawaban = soalDocs.map((s) => {
    const pilihanDipilih = jawabanSiswa[String(s._id)] ?? null;
    if (pilihanDipilih === s.jawabanBenar) jumlahBenar += 1;
    return { soal: s._id, pilihanDipilih };
  });

  const jumlahSoal = soalDocs.length || 1;
  const skor = Math.round((jumlahBenar / jumlahSoal) * 100);

  const hasil = await HasilUjian.create({
    ujian: ujian._id,
    siswa: siswa._id,
    jawaban,
    skor,
    jumlahBenar,
    jumlahSoal: soalDocs.length,
  });

  return NextResponse.json({
    skor: hasil.skor,
    jumlahBenar: hasil.jumlahBenar,
    jumlahSoal: hasil.jumlahSoal,
  });
}
