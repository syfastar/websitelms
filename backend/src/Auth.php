<?php
declare(strict_types=1);

namespace App;

/** Token bertanda tangan HMAC-SHA256 (stateless, tanpa library eksternal). */
final class Auth
{
    private static function b64(string $s): string
    {
        return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
    }

    private static function unb64(string $s): string|false
    {
        return base64_decode(strtr($s, '-_', '+/'), true);
    }

    public static function issue(int $userId, string $role): string
    {
        $payload = self::b64(json_encode([
            'uid' => $userId,
            'role' => $role,
            'exp' => time() + (int) Config::get('app.token_ttl', 43200),
        ]));
        $sig = self::b64(hash_hmac('sha256', $payload, (string) Config::get('app.secret'), true));
        return $payload . '.' . $sig;
    }

    /** @return array<string,mixed>|null user row bila token valid dan akun aktif */
    public static function userFromRequest(Request $req): ?array
    {
        $token = $req->bearer();
        if ($token === null || substr_count($token, '.') !== 1) {
            return null;
        }
        [$payload, $sig] = explode('.', $token);
        $expected = self::b64(hash_hmac('sha256', $payload, (string) Config::get('app.secret'), true));
        if (!hash_equals($expected, $sig)) {
            return null;
        }
        $json = self::unb64($payload);
        $data = $json === false ? null : json_decode($json, true);
        if (!is_array($data) || ($data['exp'] ?? 0) < time()) {
            return null;
        }
        $user = Db::one('SELECT id, name, email, role, status FROM users WHERE id = ?', [(int) $data['uid']]);
        if ($user === null || $user['status'] !== 'Aktif') {
            return null;
        }
        return $user;
    }

    /** Profil lengkap untuk frontend (termasuk data siswa / guru bila ada). */
    public static function profile(array $user): array
    {
        $out = [
            'id'    => (int) $user['id'],
            'name'  => $user['name'],
            'email' => $user['email'],
            'role'  => $user['role'],
        ];
        if ($user['role'] === 'siswa') {
            $s = Db::one(
                'SELECT s.id, s.nis, c.id AS class_id, c.name AS class_name, m.name AS major, m.code AS major_code
                 FROM students s
                 LEFT JOIN classes c ON c.id = s.class_id
                 LEFT JOIN majors m ON m.id = c.major_id
                 WHERE s.user_id = ?',
                [(int) $user['id']]
            );
            if ($s) {
                $out['student'] = [
                    'id'        => (int) $s['id'],
                    'nis'       => $s['nis'] ?? '-',
                    'class'     => $s['class_name'] ?? '-',
                    'major'     => $s['major'] ?? '-',
                    'majorCode' => $s['major_code'] ?? '-',
                ];
            }
        } elseif ($user['role'] === 'guru') {
            $t = Db::one(
                'SELECT t.id, t.nip, sb.name AS subject FROM teachers t
                 LEFT JOIN subjects sb ON sb.id = t.subject_id WHERE t.user_id = ?',
                [(int) $user['id']]
            );
            if ($t) {
                $out['teacher'] = ['id' => (int) $t['id'], 'nip' => $t['nip'], 'subject' => $t['subject']];
            }
        }
        return $out;
    }
}

final class Router
{
    /** @var array<int,array{0:string,1:string,2:callable,3:?array,4:array}> */
    private array $routes = [];

    /** @param ?array<int,string> $roles null = semua user yang sudah login; [] = publik */
    public function add(string $method, string $pattern, callable $handler, ?array $roles = null): void
    {
        $regex = preg_replace_callback('#\{(\w+)\}#', static fn($m) => '(?P<' . $m[1] . '>[0-9]+)', $pattern);
        $this->routes[] = [$method, '#^' . $regex . '$#', $handler, $roles, []];
    }

    public function dispatch(Request $req): never
    {
        $pathMatched = false;
        foreach ($this->routes as [$method, $regex, $handler, $roles]) {
            if (!preg_match($regex, $req->path, $m)) {
                continue;
            }
            $pathMatched = true;
            if ($method !== $req->method) {
                continue;
            }
            $params = array_filter($m, 'is_string', ARRAY_FILTER_USE_KEY);
            $user = null;
            if ($roles !== []) {
                $user = Auth::userFromRequest($req);
                if ($user === null) {
                    throw new ApiException(401, 'Sesi berakhir. Silakan login kembali.');
                }
                if ($roles !== null && !in_array($user['role'], $roles, true)) {
                    throw new ApiException(403, 'Anda tidak memiliki akses ke fitur ini.');
                }
            }
            $result = $handler($req, $params, $user);
            Response::json($result);
        }
        if ($pathMatched) {
            throw new ApiException(405, 'Metode HTTP tidak diizinkan untuk endpoint ini.');
        }
        throw new ApiException(404, 'Endpoint tidak ditemukan.');
    }
}
