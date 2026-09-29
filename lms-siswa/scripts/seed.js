/**
 * Jalankan: npm run seed
 * Mengisi data contoh (mirip data di desain Figma) supaya halaman
 * langsung bisa dicoba tanpa perlu bagian admin selesai dulu.
 */
require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

const SiswaSchema = new mongoose.Schema(
  {
    nama: String,
    nis: { type: String, unique: true },
    kelas: String,
    jurusan: String,
    status: String,
    semester: String,
  },
  { timestamps: true }
);
const MateriSchema = new mongoose.Schema(
  {
    judul: String,
    mataPelajaran: String,
    kelas: String,
    ukuranFile: String,
    fileUrl: String,
    tanggalUpload: Date,
  },
  { timestamps: true }
);
const TugasSchema = new mongoose.Schema(
  { judul: String, mataPelajaran: String, deskripsi: String, deadline: Date, kelas: String },
  { timestamps: true }
);
const UjianSchema = new mongoose.Schema(
  {
    judul: String,
    mataPelajaran: String,
    kelas: String,
    tanggal: Date,
    durasiMenit: Number,
    jumlahSoal: Number,
  },
  { timestamps: true }
);
const SubmissionSchema = new mongoose.Schema(
  {
    tugas: { type: mongoose.Schema.Types.ObjectId, ref: "Tugas" },
    siswa: { type: mongoose.Schema.Types.ObjectId, ref: "Siswa" },
    status: String,
    isiJawaban: String,
    nilai: Number,
    dikumpulkanPada: Date,
  },
  { timestamps: true }
);
const SoalSchema = new mongoose.Schema(
  {
    ujian: { type: mongoose.Schema.Types.ObjectId, ref: "Ujian" },
    pertanyaan: String,
    pilihan: [String],
    jawabanBenar: Number,
    urutan: Number,
  },
  { timestamps: true }
);

const Siswa = mongoose.model("Siswa", SiswaSchema);
const Materi = mongoose.model("Materi", MateriSchema);
const Tugas = mongoose.model("Tugas", TugasSchema);
const Ujian = mongoose.model("Ujian", UjianSchema);
const Submission = mongoose.model("Submission", SubmissionSchema);
const Soal = mongoose.model("Soal", SoalSchema);

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Terhubung ke MongoDB, menghapus data lama...");

  await Promise.all([
    Siswa.deleteMany({}),
    Materi.deleteMany({}),
    Tugas.deleteMany({}),
    Ujian.deleteMany({}),
    Submission.deleteMany({}),
    Soal.deleteMany({}),
  ]);

  const siswa = await Siswa.create({
    nama: "Andi Saputra",
    nis: "2024001",
    kelas: "X PPLG 1",
    jurusan: "Pengembangan Perangkat Lunak dan Gim",
    status: "Aktif",
    semester: "Ganjil 24/25",
  });

  await Materi.insertMany([
    {
      judul: "Pengantar Algoritma dan Pemrograman",
      mataPelajaran: "Pemrograman",
      kelas: "X PPLG 1",
      ukuranFile: "2.4 MB",
      fileUrl: "#",
      tanggalUpload: new Date("2025-08-01"),
    },
    {
      judul: "Dasar HTML & CSS",
      mataPelajaran: "Pemrograman Web",
      kelas: "X PPLG 1",
      ukuranFile: "5.1 MB",
      fileUrl: "#",
      tanggalUpload: new Date("2025-08-05"),
    },
    {
      judul: "Pengantar JavaScript",
      mataPelajaran: "Pemrograman Web",
      kelas: "X PPLG 1",
      ukuranFile: "120 MB",
      fileUrl: "#",
      tanggalUpload: new Date("2025-08-10"),
    },
    {
      judul: "Konsep Jaringan Komputer",
      mataPelajaran: "Jaringan Komputer",
      kelas: "X PPLG 1",
      ukuranFile: "3.8 MB",
      fileUrl: "#",
      tanggalUpload: new Date("2025-08-12"),
    },
  ]);

  const [tugas1, tugas2, tugas3] = await Tugas.create([
    {
      judul: "Tugas 1: Membuat Algoritma Pengurutan",
      mataPelajaran: "Pemrograman",
      deadline: new Date("2025-08-25"),
      kelas: "X PPLG 1",
    },
    {
      judul: "Proyek Web Portofolio",
      mataPelajaran: "Pemrograman Web",
      deadline: new Date("2025-09-01"),
      kelas: "X PPLG 1",
    },
    {
      judul: "Laporan Konfigurasi Jaringan",
      mataPelajaran: "Jaringan Komputer",
      deadline: new Date("2025-08-18"),
      kelas: "X PPLG 1",
    },
  ]);

  await Submission.insertMany([
    { tugas: tugas2._id, siswa: siswa._id, status: "Sedang Dikerjakan" },
    {
      tugas: tugas3._id,
      siswa: siswa._id,
      status: "Sudah Dikumpulkan",
      nilai: 88,
      dikumpulkanPada: new Date("2025-08-17"),
    },
  ]);

  const [ujian1] = await Ujian.create([
    {
      judul: "UH 1 - Algoritma Dasar",
      mataPelajaran: "Pemrograman",
      kelas: "X PPLG 1",
      tanggal: new Date("2025-08-20"),
      durasiMenit: 5, // dipersingkat untuk demo timer; ubah sesuai kebutuhan
      jumlahSoal: 20,
    },
    {
      judul: "Kuis Jaringan Komputer",
      mataPelajaran: "Jaringan Komputer",
      kelas: "X PPLG 1",
      tanggal: new Date("2025-08-22"),
      durasiMenit: 30,
      jumlahSoal: 15,
    },
    {
      judul: "UTS Semester 1",
      mataPelajaran: "Pemrograman Web",
      kelas: "X PPLG 1",
      tanggal: new Date("2099-09-10"), // sengaja di masa depan -> status "Mendatang"
      durasiMenit: 90,
      jumlahSoal: 40,
    },
  ]);

  // Contoh soal untuk "UH 1 - Algoritma Dasar" (jumlahSoal di atas tetap 20
  // sebagai keterangan tampilan; di sini hanya diisi beberapa untuk demo).
  await Soal.insertMany([
    {
      ujian: ujian1._id,
      pertanyaan: "Struktur data apa yang bekerja dengan prinsip LIFO (Last In First Out)?",
      pilihan: ["Queue", "Stack", "Array", "Linked List"],
      jawabanBenar: 1,
      urutan: 1,
    },
    {
      ujian: ujian1._id,
      pertanyaan: "Kompleksitas waktu terbaik untuk algoritma Bubble Sort adalah?",
      pilihan: ["O(1)", "O(n)", "O(n log n)", "O(n^2)"],
      jawabanBenar: 1,
      urutan: 2,
    },
    {
      ujian: ujian1._id,
      pertanyaan: "Proses memecah masalah besar menjadi sub-masalah yang lebih kecil disebut?",
      pilihan: ["Iterasi", "Rekursi", "Enkapsulasi", "Polimorfisme"],
      jawabanBenar: 1,
      urutan: 3,
    },
  ]);

  console.log("Selesai! Data contoh siswa NIS 2024001 siap dipakai.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
