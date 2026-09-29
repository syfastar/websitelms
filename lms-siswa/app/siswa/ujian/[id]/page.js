import { connectDB } from "@/lib/mongodb";
import { getCurrentSiswa } from "@/lib/currentSiswa";
import Ujian from "@/models/Ujian";
import Soal from "@/models/Soal";
import HasilUjian from "@/models/HasilUjian";
import Topbar from "@/components/Topbar";
import ExamRunner from "@/components/ExamRunner";
import Link from "next/link";

function InfoCard({ title, message }) {
  return (
    <div className="bg-white rounded-xl border p-8 text-center max-w-md mx-auto">
      <p className="font-medium mb-1">{title}</p>
      <p className="text-sm text-gray-500 mb-6">{message}</p>
      <Link
        href="/siswa/ujian"
        className="inline-block bg-brand text-white text-sm px-5 py-2 rounded-lg hover:bg-brand-dark"
      >
        Kembali ke Ujian & Kuis
      </Link>
    </div>
  );
}

export default async function UjianDetailPage({ params }) {
  await connectDB();
  const siswa = await getCurrentSiswa();

  if (!siswa) {
    return <div className="p-8">Data siswa tidak ditemukan.</div>;
  }

  const ujian = await Ujian.findOne({ _id: params.id, kelas: siswa.kelas }).lean();
  if (!ujian) {
    return <div className="p-8">Ujian tidak ditemukan.</div>;
  }

  const status = new Date(ujian.tanggal) <= new Date() ? "Tersedia" : "Mendatang";
  const hasil = await HasilUjian.findOne({ ujian: ujian._id, siswa: siswa._id }).lean();

  let body;
  if (hasil) {
    body = (
      <div className="bg-white rounded-xl border p-8 text-center max-w-md mx-auto">
        <p className="text-gray-500 mb-1">Kamu sudah mengerjakan ujian ini</p>
        <p className="text-4xl font-semibold text-brand mb-2">{hasil.skor}</p>
        <p className="text-sm text-gray-500 mb-6">
          Benar {hasil.jumlahBenar} dari {hasil.jumlahSoal} soal
        </p>
        <Link
          href="/siswa/ujian"
          className="inline-block bg-brand text-white text-sm px-5 py-2 rounded-lg hover:bg-brand-dark"
        >
          Kembali ke Ujian & Kuis
        </Link>
      </div>
    );
  } else if (status !== "Tersedia") {
    body = (
      <InfoCard
        title={ujian.judul}
        message="Ujian ini belum tersedia. Kembali lagi pada tanggalnya."
      />
    );
  } else {
    const soalDocs = await Soal.find({ ujian: ujian._id }).sort({ urutan: 1 }).lean();
    const soal = soalDocs.map((s) => ({
      id: String(s._id),
      pertanyaan: s.pertanyaan,
      pilihan: s.pilihan,
    }));

    if (soal.length === 0) {
      body = (
        <InfoCard
          title={ujian.judul}
          message="Soal untuk ujian ini belum ditambahkan oleh guru."
        />
      );
    } else {
      body = (
        <ExamRunner
          ujianId={String(ujian._id)}
          ujian={{ judul: ujian.judul, durasiMenit: ujian.durasiMenit }}
          soal={soal}
          nis={siswa.nis}
        />
      );
    }
  }

  return (
    <div>
      <Topbar section="Exams" siswa={siswa} />
      <div className="p-8 max-w-3xl mx-auto">{body}</div>
    </div>
  );
}
