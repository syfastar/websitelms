<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Config;

final class Grading
{
    /** Nilai akhir berbobot; bobot dinormalisasi hanya atas komponen yang sudah punya nilai. */
    public static function finalScore(?float $tugas, ?float $uh, ?float $uts, ?float $uas): ?float
    {
        $w = Config::get('app.weights', ['tugas' => 0.2, 'uh' => 0.3, 'uts' => 0.2, 'uas' => 0.3]);
        $parts = ['tugas' => $tugas, 'uh' => $uh, 'uts' => $uts, 'uas' => $uas];
        $sum = 0.0;
        $weight = 0.0;
        foreach ($parts as $k => $v) {
            if ($v !== null) {
                $sum += $v * (float) $w[$k];
                $weight += (float) $w[$k];
            }
        }
        return $weight > 0 ? round($sum / $weight, 1) : null;
    }

    public static function predikat(?float $final): string
    {
        if ($final === null) {
            return '-';
        }
        return $final >= 90 ? 'A' : ($final >= 80 ? 'B' : ($final >= 70 ? 'C' : 'D'));
    }

    public static function kkm(): float
    {
        return (float) Config::get('app.kkm', 75);
    }

    /** Kelompok komponen nilai berdasarkan tipe asesmen. */
    public static function group(string $assessmentType): string
    {
        return match ($assessmentType) {
            'Kuis', 'Ulangan Harian' => 'uh',
            'Ujian Tengah Semester'  => 'uts',
            default                  => 'uas',
        };
    }
}
