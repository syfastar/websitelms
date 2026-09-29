import { connectDB } from "./mongodb";
import Siswa from "@/models/Siswa";

/**
 * Sementara belum ada sistem login yang digabung dengan bagian role admin,
 * jadi siswa yang sedang "login" ditentukan dari NIS di query (?nis=)
 * atau fallback ke DEMO_STUDENT_NIS di .env.local.
 *
 * Saat auth sudah digabung, ganti fungsi ini agar mengambil NIS
 * dari session/JWT yang sudah ada, lalu semua halaman & API lain
 * otomatis ikut terpakai tanpa perubahan lain.
 */
export async function getCurrentSiswa(nisFromQuery) {
  await connectDB();
  const nis = nisFromQuery || process.env.DEMO_STUDENT_NIS;
  const siswa = await Siswa.findOne({ nis });
  return siswa;
}
