import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentSiswa } from "@/lib/currentSiswa";
import Submission from "@/models/Submission";

export async function POST(request, { params }) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const siswa = await getCurrentSiswa(searchParams.get("nis"));
  if (!siswa) {
    return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const isiJawaban = body.isiJawaban || "";

  const submission = await Submission.findOneAndUpdate(
    { tugas: params.id, siswa: siswa._id },
    {
      status: "Sudah Dikumpulkan",
      isiJawaban,
      dikumpulkanPada: new Date(),
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({
    id: String(submission._id),
    status: submission.status,
    dikumpulkanPada: submission.dikumpulkanPada,
  });
}
