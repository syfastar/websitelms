function parse(d: string): Date {
  // "YYYY-MM-DD" diparse sebagai tanggal lokal (hindari geser zona waktu)
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(d.replace(" ", "T"));
}

export function formatDate(d?: string | null): string {
  if (!d) return "-";
  const dt = parse(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(d?: string | null): string {
  if (!d) return "-";
  const dt = parse(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatBytes(n?: number | null): string {
  if (n === null || n === undefined) return "-";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function num(v: number | null | undefined, digits = 1): string {
  return v === null || v === undefined ? "-" : v.toFixed(digits).replace(/\.0+$/, "");
}

export function predikatBadge(p: string): string {
  return p === "A" ? "badge-green" : p === "B" ? "badge-blue" : p === "C" ? "badge-amber" : p === "D" ? "badge-red" : "badge-slate";
}

export function currentAcademicYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() + 1 >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

export function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const esc = (v: string | number | null) => {
    const s = v === null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "\uFEFF" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
