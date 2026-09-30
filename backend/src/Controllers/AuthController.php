<?php
declare(strict_types=1);

namespace App\Controllers;

use App\ApiException;
use App\Auth;
use App\Db;
use App\Input;
use App\Request;

final class AuthController
{
    public function login(Request $req): array
    {
        $d = $req->input();
        $errors = [];
        $email = Input::str($d, 'email', 'Email', $errors, true, 190);
        $password = isset($d['password']) && !is_array($d['password']) ? (string) $d['password'] : '';
        if ($password === '') {
            $errors['password'] = 'Password wajib diisi.';
        }
        Input::assertValid($errors);

        $user = Db::one('SELECT * FROM users WHERE email = ?', [strtolower((string) $email)]);
        // Selalu jalankan password_verify agar waktu respons tidak membocorkan apakah email terdaftar.
        $hash = $user['password_hash'] ?? '$2y$10$pEa1FmuC99J9iclhE21KCeSXBeMwZjGmnDQDMnc4NR8ZKBxE4Ibje';
        $ok = password_verify($password, $hash);
        if (!$user || !$ok) {
            throw new ApiException(401, 'Email atau password salah.');
        }
        if ($user['status'] !== 'Aktif') {
            throw new ApiException(403, 'Akun Anda dinonaktifkan. Hubungi administrator.');
        }
        Db::exec('UPDATE users SET last_login = NOW() WHERE id = ?', [$user['id']]);

        return [
            'token' => Auth::issue((int) $user['id'], $user['role']),
            'user'  => Auth::profile($user),
        ];
    }

    public function me(Request $req, array $p, array $user): array
    {
        return Auth::profile($user);
    }
}
