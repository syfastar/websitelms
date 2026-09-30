import { ReactNode, useState } from "react";
import { ApiError } from "../lib/api";

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: wide ? 760 : 480, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div className="modal-title" style={{ margin: 0 }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#94a3b8" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function StatCard({ icon, label, value, color = "#3b82f6", sub }: { icon: string; label: string; value: string | number; color?: string; sub?: string }) {
  return (
    <div className="stat-card" style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
      <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.375rem", flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: "0.8125rem", color: "#64748b", fontWeight: 500 }}>{label}</div>
        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "1.625rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>{value}</div>
        {sub && <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.125rem" }}>{sub}</div>}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", gap: "1rem" }}>
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Loading({ text = "Memuat data..." }: { text?: string }) {
  return <div style={{ padding: "3rem 1rem", textAlign: "center", color: "#94a3b8", fontSize: "0.875rem" }}>{text}</div>;
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: "0.625rem", padding: "0.875rem 1rem", fontSize: "0.875rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
      <span>{message}</span>
      {onRetry && <button className="btn-edit" onClick={onRetry}>Coba lagi</button>}
    </div>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return <div style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", borderRadius: "0.625rem", padding: "0.875rem 1rem", fontSize: "0.875rem", marginBottom: "1rem" }}>{children}</div>;
}

export function Empty({ text }: { text: string }) {
  return <div style={{ padding: "2rem 1rem", textAlign: "center", color: "#94a3b8", fontSize: "0.875rem" }}>{text}</div>;
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
      {hint && !error && <div style={{ color: "#94a3b8", fontSize: "0.75rem", marginTop: "0.25rem" }}>{hint}</div>}
      {error && <div style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "0.25rem" }}>{error}</div>}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: "0.5rem", padding: "0.625rem 0.875rem", fontSize: "0.8125rem", marginBottom: "0.75rem" }}>{message}</div>;
}

export function ModalActions({ onCancel, onSave, saving, saveLabel = "Simpan" }: { onCancel: () => void; onSave: () => void; saving?: boolean; saveLabel?: string }) {
  return (
    <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.25rem" }}>
      <button onClick={onCancel} style={{ padding: "0.5rem 1rem", border: "1px solid #e2e8f0", borderRadius: "0.5rem", background: "white", cursor: "pointer", fontSize: "0.875rem" }}>Batal</button>
      <button className="btn-primary" onClick={onSave} disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>{saving ? "Menyimpan..." : saveLabel}</button>
    </div>
  );
}

export function Progress({ value, total, color = "#3b82f6", width = 80 }: { value: number; total: number; color?: string; width?: number | string }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <div style={{ width, height: 6, background: "#e2e8f0", borderRadius: 3 }}>
        <div style={{ height: "100%", borderRadius: 3, background: color, width: `${pct}%` }} />
      </div>
      <span style={{ fontSize: "0.8125rem", color: "#64748b", whiteSpace: "nowrap" }}>{value}/{total}</span>
    </div>
  );
}

/** Menjalankan aksi simpan ke API sambil melacak status, pesan error, dan error per-field. */
export function useSave() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const reset = () => { setError(null); setFieldErrors({}); };
  const run = async (fn: () => Promise<unknown>): Promise<boolean> => {
    setSaving(true);
    reset();
    try {
      await fn();
      return true;
    } catch (e) {
      if (e instanceof ApiError) { setError(e.message); setFieldErrors(e.errors); }
      else setError("Terjadi kesalahan tak terduga.");
      return false;
    } finally {
      setSaving(false);
    }
  };
  return { saving, error, fieldErrors, run, reset };
}

export const cancelBtnStyle = { padding: "0.5rem 1rem", border: "1px solid #e2e8f0", borderRadius: "0.5rem", background: "white", cursor: "pointer", fontSize: "0.875rem" } as const;
