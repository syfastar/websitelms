import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentSiswa } from "@/lib/currentSiswa";
import Ujian from "@/models/Ujian";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const siswa = await getCurrentSiswa(searchParams.get("nis"));
  if (!siswa) {
    return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
  }

  const ujian = await Ujian.find({ kelas: siswa.kelas }).sort({ tanggal: 1 }).lean();

  return NextResponse.json(
    ujian.map((u) => ({
      id: String(u._id),
      judul: u.judul,
      mataPelajaran: u.mataPelajaran,
      tanggal: u.tanggal,
      durasiMenit: u.durasiMenit,
      jumlahSoal: u.jumlahSoal,
      status: new Date(u.tanggal) <= new Date() ? "Tersedia" : "Mendatang",
    }))
  );
}
