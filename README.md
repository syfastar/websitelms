# Lumora E-Learning — Fullstack (React + PHP + MySQL / Laragon)

Frontend dari Figma Make (React + Vite + Tailwind) sudah dihubungkan ke backend REST API
PHP 8.1+ dan MySQL. Semua role berfungsi: **Admin, Guru, Siswa, Kurikulum, Kepala Sekolah**.

```
lumora-fullstack/
├── backend/     API PHP (tanpa Composer)  → salin ke C:\laragon\www\lumora-api
├── database/    lumora.sql (skema + data contoh)
└── frontend/    React + Vite (proyek dari Figma Make)
```

## 1. Setup backend (Laragon)

1. **Start All** di Laragon (Apache + MySQL). Pastikan PHP ≥ 8.1 (Menu → PHP → Version).
2. Salin folder `backend` ke `C:\laragon\www\` lalu **ubah namanya menjadi `lumora-api`**
   → `C:\laragon\www\lumora-api\index.php`.
3. Buat virtual host otomatis: Laragon → Menu → Apache → *Reload* (atau klik kanan tray →
   *Reload*). API bisa dibuka di **http://lumora-api.test/api**
   (jika `.test` tidak jalan: tanpa virtual host pakai `http://localhost/lumora-api/api`).
4. Import database: Laragon → **Database → HeidiSQL** → Open → jalankan `database/lumora.sql`
   (atau `mysql -u root < database/lumora.sql`). Database `lumora_elearning` dibuat otomatis.
   ⚠️ File ini **menghapus & membuat ulang** semua tabel.
5. Tes: buka `http://lumora-api.test/api` → harus tampil `{"data":{"name":"Lumora E-Learning API","status":"ok",...}}`.

Konfigurasi ada di `backend/config.php` (default cocok untuk Laragon: user `root`, password kosong).
Untuk mengubah tanpa mengedit file asli, buat `backend/config.local.php`:

```php
<?php
return [
  'db'  => ['pass' => 'password-mysql-anda'],
  'app' => ['secret' => 'string-acak-panjang-min-32-karakter', 'debug' => false,
            'cors_origins' => ['http://localhost:8443', 'http://192.168.1.10:8443']],
];
```

Upload file besar: naikkan `upload_max_filesize` dan `post_max_size` (Laragon → Menu → PHP → php.ini)
minimal 25M, lalu restart Apache.

## 2. Setup frontend

Butuh Node.js 22 (Laragon → Menu → Tools/Node.js, atau nodejs.org).

```bash
cd frontend
copy .env.example .env      # sesuaikan VITE_API_URL bila perlu
npm install                 # atau: pnpm install
npm run dev                 # http://localhost:8443
```

`VITE_API_URL` default: `http://lumora-api.test/api`. Jika memakai cara tanpa virtual host,
isi `http://localhost/lumora-api/api`. Ubah `.env` → restart `npm run dev`.

Build produksi: `npm run build` (hasil di `frontend/dist`). Jika frontend diakses dari alamat/port
selain yang ada di `cors_origins`, tambahkan alamat itu di `config.local.php`.

## 3. Akun demo (dari `database/lumora.sql`)

| Role | Email | Password |
|---|---|---|
| Admin | admin@lumora.sch.id | admin123 |
| Kepala Sekolah | kepsek@lumora.sch.id | kepsek123 |
| Kurikulum | kurikulum@lumora.sch.id | kuri123 |
| Guru | siti@lumora.sch.id (juga budi, ahmad, dewi, rizky) | guru123 |
| Siswa | andi@lumora.sch.id (juga bunga, cahyo, dina, erik, fitri, galih, hani, indra, jihan) | siswa123 |

**Ganti semua password & `app.secret` sebelum dipakai sungguhan.** Hapus juga
`frontend/src/data/demoAccounts.ts` dan panel “Demo Akun Siswa” di `Login.tsx`.

## 4. Fitur per role

| Role | Fitur |
|---|---|
| **Admin** | Statistik; CRUD akun (role, status, reset password); CRUD kelas & jurusan (wali kelas); CRUD guru (mapel + kelas yang diajar); CRUD siswa (NIS, kelas) |
| **Guru** | Upload materi (file / link); buat asesmen (Kuis/UH/UTS/UAS) + bank soal pilihan ganda + lihat hasil; buat tugas + beri nilai & catatan pengumpulan siswa; rekap nilai per kelas + export CSV |
| **Siswa** | Unduh materi kelasnya; kumpulkan tugas (jawaban/file, bisa diubah sebelum dinilai); ujian dengan timer server-side, dinilai otomatis |
| **Kurikulum & Kepsek** | Dashboard ringkasan; nilai per mapel; monitoring tugas; monitoring pembuatan soal; data guru & siswa (read-only) |

Aturan penting: kunci jawaban **tidak pernah dikirim** ke siswa; ujian hanya bisa dikerjakan sekali dan
waktu dihitung di server; guru hanya bisa mengelola kelas yang ia ajar; soal terkunci setelah ada siswa yang
mengerjakan; nilai akhir = Tugas 20% + UH/Kuis 30% + UTS 20% + UAS 30% (ubah di `config.php` → `weights`,
KKM di `kkm`).

## 5. Ringkasan endpoint

Semua respons berbentuk `{"data": ...}` atau `{"error": {"message": "...", "errors": {...}}}`.
Login: `POST /api/auth/login` → `token` dikirim sebagai `Authorization: Bearer <token>` (berlaku 12 jam).
Daftar lengkap ada di `backend/index.php`.

## 6. Troubleshooting

| Gejala | Solusi |
|---|---|
| “Tidak dapat terhubung ke server” | Apache belum jalan / `VITE_API_URL` salah (buka URL `/api` di browser) |
| Error CORS di console | Tambahkan origin frontend ke `cors_origins` di `config.local.php` |
| “Database tidak dapat diakses” | MySQL belum jalan / `lumora.sql` belum diimpor / password `root` tidak kosong |
| 401 terus setelah login | Apache membuang header Authorization → pastikan `.htaccess` ikut tersalin & `mod_rewrite` aktif |
| 404 di semua endpoint | Folder harus bernama `lumora-api` (atau sesuaikan URL); pastikan `.htaccess` ada |
| Upload gagal | Naikkan `upload_max_filesize` / `post_max_size` di php.ini |
