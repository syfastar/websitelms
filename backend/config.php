<?php
/**
 * Konfigurasi backend Lumora.
 * Default sudah cocok dengan Laragon (MySQL user "root", password kosong).
 * Untuk override tanpa mengubah file ini, buat file config.local.php yang
 * me-return array dengan struktur yang sama (hanya key yang ingin diganti).
 */
$config = [
    'db' => [
        'host'    => '127.0.0.1',
        'port'    => 3306,
        'name'    => 'lumora_elearning',
        'user'    => 'root',
        'pass'    => '',
        'charset' => 'utf8mb4',
    ],
    'app' => [
        // WAJIB diganti di server sungguhan (string acak panjang). Dipakai untuk menandatangani token login.
        'secret'        => 'ganti-dengan-string-acak-minimal-32-karakter',
        'token_ttl'     => 60 * 60 * 12,          // token berlaku 12 jam
        'timezone'      => 'Asia/Jakarta',
        'debug'         => true,                   // false di produksi: pesan error internal disembunyikan
        'kkm'           => 75,                     // batas kelulusan nilai
        'max_upload_mb' => 25,
        // Asal (origin) frontend yang boleh memanggil API (CORS)
        'cors_origins'  => [
            'http://localhost:8443',
            'http://127.0.0.1:8443',
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://lumora.test',
        ],
        // Bobot nilai akhir (dinormalisasi otomatis jika ada komponen yang belum punya nilai)
        'weights' => ['tugas' => 0.20, 'uh' => 0.30, 'uts' => 0.20, 'uas' => 0.30],
    ],
];

if (is_file(__DIR__ . '/config.local.php')) {
    $config = array_replace_recursive($config, require __DIR__ . '/config.local.php');
}

return $config;
