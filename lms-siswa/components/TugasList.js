"use client";

import { useState } from "react";

const statusStyle = {
  "Belum Dikumpulkan": "bg-status-pending/10 text-status-pending",
  "Sedang Dikerjakan": "bg-status-progress/10 text-status-progress",
  "Sudah Dikumpulkan": "bg-status-done/10 text-status-done",
};

function formatTanggal(date) {
  return new Date(date).toLocaleDateString("sv-SE");
}

export default function TugasList({ initialTugas, nis }) {
  const [tugas, setTugas] = useState(initialTugas);
  const [openId, setOpenId] = useState(null);
  const [jawaban, setJawaban] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleKumpulkan(id) {
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/tugas/${id}/submit${nis ? `?nis=${nis}` : ""}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isiJawaban: jawaban }),
        }
      );
      if (!res.ok) throw new Error("Gagal mengumpulkan tugas");
      setTugas((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, status: "Sudah Dikumpulkan" } : t
        )
      );
      setOpenId(null);
      setJawaban("");
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {tugas.map((t) => (
        <div key={t.id} className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center text-lg shrink-0">
                📋
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{t.judul}</p>
                <p className="text-xs text-gray-500">
                  {t.mataPelajaran} · Deadline: {formatTanggal(t.deadline)}
                </p>
                {t.status === "Sudah Dikumpulkan" && t.nilai != null && (
                  <p className="text-xs text-status-done font-medium">
                    Nilai: {t.nilai}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-xs px-2 py-1 rounded-full ${statusStyle[t.status]}`}>
                {t.status}
              </span>
              {t.status !== "Sudah Dikumpulkan" && (
                <button
                  onClick={() => setOpenId(openId === t.id ? null : t.id)}
                  className="bg-brand text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-dark"
                >
                  Kumpulkan
                </button>
              )}
            </div>
          </div>

          {openId === t.id && (
            <div className="mt-3 pt-3 border-t">
              <textarea
                className="w-full border rounded-lg p-2 text-sm mb-2"
                rows={3}
                placeholder="Tulis jawaban atau tempel link tugasmu di sini..."
                value={jawaban}
                onChange={(e) => setJawaban(e.target.value)}
              />
              <button
                onClick={() => handleKumpulkan(t.id)}
                disabled={submitting}
                className="bg-brand text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-dark disabled:opacity-50"
              >
                {submitting ? "Mengirim..." : "Kirim Tugas"}
              </button>
            </div>
          )}
        </div>
      ))}
      {tugas.length === 0 && (
        <p className="text-gray-400">Belum ada tugas untuk kelasmu.</p>
      )}
    </div>
  );
}
