import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentSiswa } from "@/lib/currentSiswa";
import Materi from "@/models/Materi";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const siswa = await getCurrentSiswa(searchParams.get("nis"));
  if (!siswa) {
    return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
  }

  const materi = await Materi.find({ kelas: siswa.kelas })
    .sort({ tanggalUpload: -1 })
    .lean();

  return NextResponse.json(
    materi.map((m) => ({
      id: String(m._id),
      judul: m.judul,
      mataPelajaran: m.mataPelajaran,
      kelas: m.kelas,
      ukuranFile: m.ukuranFile,
      fileUrl: m.fileUrl,
      tanggalUpload: m.tanggalUpload,
    }))
  );
}
