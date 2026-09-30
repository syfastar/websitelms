<?php
declare(strict_types=1);

namespace App\Controllers;

use App\ApiException;
use App\Db;

/** Helper konteks guru: profil guru & kelas yang diajar. */
final class GuruContext
{
    /** @return array{id:int,subject_id:?int} */
    public static function teacher(array $user): array
    {
        $t = Db::one('SELECT id, subject_id FROM teachers WHERE user_id = ?', [(int) $user['id']]);
        if (!$t) {
            throw new ApiException(403, 'Profil guru untuk akun ini belum dibuat. Hubungi administrator.');
        }
        return ['id' => (int) $t['id'], 'subject_id' => $t['subject_id'] === null ? null : (int) $t['subject_id']];
    }

    /** @return int[] */
    public static function classIds(array $user): array
    {
        $t = Db::one('SELECT id FROM teachers WHERE user_id = ?', [(int) $user['id']]);
        if (!$t) {
            return [];
        }
        return array_map('intval', array_column(
            Db::all('SELECT class_id FROM teacher_classes WHERE teacher_id = ?', [(int) $t['id']]),
            'class_id'
        ));
    }

    /** Pastikan guru boleh mengelola kelas tsb dan sudah punya mata pelajaran. */
    public static function assertCanTeach(array $teacher, int $classId): void
    {
        if ($teacher['subject_id'] === null) {
            throw new ApiException(422, 'Anda belum memiliki mata pelajaran. Hubungi administrator.');
        }
        $ok = Db::value('SELECT 1 FROM teacher_classes WHERE teacher_id = ? AND class_id = ?', [$teacher['id'], $classId]);
        if (!$ok) {
            throw new ApiException(422, 'Anda tidak mengajar di kelas tersebut.', ['class_id' => 'Pilih kelas yang Anda ajar.']);
        }
    }
}
