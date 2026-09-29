"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function formatWaktu(detik) {
  const m = Math.floor(detik / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(detik % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export default function ExamRunner({ ujianId, ujian, soal, nis }) {
  const router = useRouter();
  const [jawaban, setJawaban] = useState({}); // { soalId: pilihanIndex }
  const [sisaDetik, setSisaDetik] = useState(ujian.durasiMenit * 60);
  const [submitting, setSubmitting] = useState(false);
  const [hasil, setHasil] = useState(null);
  const [error, setError] = useState("");
  const submittedRef = useRef(false);

  useEffect(() => {
    if (hasil) return;
    const interval = setInterval(() => {
      setSisaDetik((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!submittedRef.current) handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasil]);

  function pilihJawaban(soalId, index) {
    setJawaban((prev) => ({ ...prev, [soalId]: index }));
  }

  async function handleSubmit(otomatis = false) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/ujian/${ujianId}/submit${nis ? `?nis=${nis}` : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jawaban }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim jawaban");
      setHasil(data);
    } catch (err) {
      setError(err.message);
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }

  if (hasil) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center max-w-md mx-auto">
        <p className="text-gray-500 mb-1">Ujian selesai</p>
        <p className="text-4xl font-semibold text-brand mb-2">{hasil.skor}</p>
        <p className="text-sm text-gray-500 mb-6">
          Benar {hasil.jumlahBenar} dari {hasil.jumlahSoal} soal
        </p>
        <button
          onClick={() => router.push("/siswa/ujian")}
          className="bg-brand text-white text-sm px-5 py-2 rounded-lg hover:bg-brand-dark"
        >
          Kembali ke Ujian & Kuis
        </button>
      </div>
    );
  }

  const terjawab = Object.keys(jawaban).length;

  return (
    <div>
      <div className="flex items-center justify-between bg-white rounded-xl border px-5 py-3 mb-5 sticky top-0">
        <div>
          <p className="font-medium">{ujian.judul}</p>
          <p className="text-xs text-gray-500">
            {terjawab} dari {soal.length} soal terjawab
          </p>
        </div>
        <div
          className={`text-lg font-semibold tabular-nums ${
            sisaDetik <= 30 ? "text-status-pending" : "text-brand"
          }`}
        >
          ⏱ {formatWaktu(sisaDetik)}
        </div>
      </div>

      {error && (
        <p className="text-status-pending text-sm mb-4">{error}</p>
      )}

      <div className="space-y-4">
        {soal.map((s, i) => (
          <div key={s.id} className="bg-white rounded-xl border p-4">
            <p className="font-medium mb-3">
              {i + 1}. {s.pertanyaan}
            </p>
            <div className="space-y-2">
              {s.pilihan.map((opsi, idx) => (
                <label
                  key={idx}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm cursor-pointer ${
                    jawaban[s.id] === idx
                      ? "border-brand bg-brand-light"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name={`soal-${s.id}`}
                    checked={jawaban[s.id] === idx}
                    onChange={() => pilihJawaban(s.id, idx)}
                    className="accent-brand"
                  />
                  {opsi}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => handleSubmit(false)}
        disabled={submitting}
        className="mt-6 w-full bg-brand text-white py-3 rounded-lg font-medium hover:bg-brand-dark disabled:opacity-50"
      >
        {submitting ? "Mengirim..." : "Selesai & Kumpulkan Jawaban"}
      </button>
    </div>
  );
}
