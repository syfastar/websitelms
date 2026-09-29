# E-Learning Lumora — Role Siswa

Bagian role **Siswa** untuk LMS Syifa Nur, dibangun dengan Next.js (App Router)
dan MongoDB (Mongoose), mengikuti desain Figma "Design E-Learning Platform"
(Dashboard, Materi Pelajaran, Tugas Saya, Ujian & Kuis).

## Menjalankan di lokal

1. `npm install`
2. Salin `.env.local.example` menjadi `.env.local`, isi `MONGODB_URI` dengan
   koneksi MongoDB kamu (bisa MongoDB Atlas atau lokal).
3. Isi data contoh: `npm run seed`
   (membuat 1 siswa demo, NIS `2024001`, kelas `X PPLG 1`, beserta materi,
   tugas, dan ujian contoh — sama seperti isi di desain Figma).
4. `npm run dev`, lalu buka `http://localhost:3000` — otomatis diarahkan ke
   `/siswa/dashboard`.

## Struktur

- `models/` — schema Mongoose: `Siswa`, `Materi`, `Tugas`, `Submission`,
  `Ujian`, `Soal`, `HasilUjian`
- `app/api/` — endpoint data: `/api/dashboard`, `/api/materi`, `/api/tugas`,
  `/api/tugas/[id]/submit`, `/api/ujian`, `/api/ujian/[id]`,
  `/api/ujian/[id]/submit`
- `app/siswa/` — halaman: `dashboard`, `materi`, `tugas`, `ujian`,
  `ujian/[id]` (halaman pengerjaan soal)
- `components/` — `Sidebar`, `Topbar`, `TugasList` (kumpul tugas),
  `ExamRunner` (pengerjaan ujian: pilihan ganda + timer mundur)

## Fitur ujian (pilihan ganda + timer)

- Soal pilihan ganda per ujian disimpan di koleksi `Soal`, dengan
  `jawabanBenar` yang **tidak pernah dikirim ke browser** — penilaian
  dihitung di server (`/api/ujian/[id]/submit`).
- Timer mundur otomatis mengirim jawaban begitu waktu habis.
- Satu siswa hanya bisa mengerjakan satu ujian sekali (`HasilUjian` punya
  unique index per ujian+siswa) — percobaan kedua akan ditolak API dan
  halaman akan langsung menampilkan hasil sebelumnya.
- Contoh 3 soal untuk "UH 1 - Algoritma Dasar" sudah ada di `npm run seed`
  (durasinya sengaja dipersingkat jadi 5 menit supaya gampang dites; ubah
  `durasiMenit` di `scripts/seed.js` sesuai kebutuhan asli).

## Belum digabung / masih perlu keputusan

- **Login/auth**: belum ada. Siswa "aktif" saat ini ditentukan dari
  `DEMO_STUDENT_NIS` di `.env.local` (lihat `lib/currentSiswa.js`). Begitu
  sistem login dari bagian role admin sudah ada, tinggal ganti isi fungsi
  `getCurrentSiswa()` supaya membaca NIS dari session, dan semua halaman/API
  lain otomatis ikut terpakai tanpa perubahan lain.
- **Kumpulkan tugas**: sekarang berupa form teks/link sederhana (tersimpan di
  field `isiJawaban`). Kalau butuh upload file asli, perlu ditambahkan storage
  (misalnya Cloudinary/S3) — beri tahu saja kalau ini dibutuhkan.
- **Input soal ujian**: belum ada halaman untuk guru/admin menambah soal —
  soal ditambahkan langsung ke koleksi `Soal` (lewat seed script atau
  MongoDB Compass) untuk sekarang. Kalau bagian admin butuh form input soal,
  ini bisa dibuatkan terpisah.
- **Struktur database**: dibuat baru (belum ada akses ke source code bagian
  role admin). Kalau koleksi `materi`/`tugas`/`ujian` di bagian admin punya
  nama field berbeda, sesuaikan nama field di `models/` supaya keduanya
  membaca collection yang sama.
