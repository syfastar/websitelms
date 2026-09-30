// Akun demo siswa HANYA untuk tombol "quick pick" di halaman login (data sama dengan database/lumora.sql).
// Hapus file ini & bagian demo di Login.tsx sebelum dipakai sungguhan.
import type { User } from "../context/AuthContext";

export const studentAccounts: { email: string; password: string; user: User }[] = [
  {
    email: "andi@lumora.sch.id",
    password: "siswa123",
    user: {
      name: "Andi Saputra",
      role: "siswa",
      email: "andi@lumora.sch.id",
      student: { nis: "2024001", class: "X PPLG 1", major: "Pengembangan Perangkat Lunak dan Gim", majorCode: "PPLG" },
    },
  },
  {
    email: "bunga@lumora.sch.id",
    password: "siswa123",
    user: {
      name: "Bunga Maharani",
      role: "siswa",
      email: "bunga@lumora.sch.id",
      student: { nis: "2024002", class: "XI DKV 1", major: "Desain Komunikasi Visual", majorCode: "DKV" },
    },
  },
  {
    email: "cahyo@lumora.sch.id",
    password: "siswa123",
    user: {
      name: "Cahyo Nugroho",
      role: "siswa",
      email: "cahyo@lumora.sch.id",
      student: { nis: "2024003", class: "X TKJT 1", major: "Teknik Jaringan Komputer dan Telekomunikasi", majorCode: "TKJT" },
    },
  },
  {
    email: "dina@lumora.sch.id",
    password: "siswa123",
    user: {
      name: "Dina Pertiwi",
      role: "siswa",
      email: "dina@lumora.sch.id",
      student: { nis: "2024004", class: "XI BDP 2", major: "Bisnis Daring dan Pemasaran", majorCode: "BDP" },
    },
  },
  {
    email: "erik@lumora.sch.id",
    password: "siswa123",
    user: {
      name: "Erik Kusuma",
      role: "siswa",
      email: "erik@lumora.sch.id",
      student: { nis: "2024005", class: "XII MPLB 1", major: "Manajemen Perkantoran dan Layanan Bisnis", majorCode: "MPLB" },
    },
  },
  {
    email: "fitri@lumora.sch.id",
    password: "siswa123",
    user: {
      name: "Fitri Handayani",
      role: "siswa",
      email: "fitri@lumora.sch.id",
      student: { nis: "2024006", class: "XI PHT 1", major: "Perhotelan", majorCode: "Perhotelan" },
    },
  },
];
