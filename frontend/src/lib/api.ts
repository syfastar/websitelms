/**
 * Klien HTTP untuk backend Lumora (PHP + MySQL di Laragon).
 * Alamat API diatur lewat VITE_API_URL di file .env (lihat .env.example).
 */
const DEFAULT_BASE = "http://lumora-api.test/api";
export const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) || DEFAULT_BASE).replace(/\/+$/, "");

const TOKEN_KEY = "lumora_token";

export const tokenStore = {
  get: (): string | null => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (t: string) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* abaikan */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* abaikan */ } },
};

export class ApiError extends Error {
  status: number;
  errors: Record<string, string>;
  constructor(message: string, status: number, errors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

function authHeaders(): Record<string, string> {
  const token = tokenStore.get();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", ...authHeaders() };
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body; // browser mengatur Content-Type + boundary sendiri
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(API_BASE + path, { method, headers, body: payload });
  } catch {
    throw new ApiError(
      "Tidak dapat terhubung ke server. Pastikan Apache & MySQL di Laragon sudah berjalan dan VITE_API_URL benar.",
      0,
    );
  }

  let json: any = null;
  try { json = await res.json(); } catch { /* respons bukan JSON */ }

  if (!res.ok) {
    if (res.status === 401 && tokenStore.get()) {
      tokenStore.clear();
      window.dispatchEvent(new Event("lumora:unauthorized"));
    }
    throw new ApiError(json?.error?.message ?? `Permintaan gagal (${res.status}).`, res.status, json?.error?.errors ?? {});
  }
  return json?.data as T;
}

export const api = {
  get: <T,>(path: string) => request<T>("GET", path),
  post: <T,>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  put: <T,>(path: string, body?: unknown) => request<T>("PUT", path, body ?? {}),
  del: <T,>(path: string) => request<T>("DELETE", path),

  /** Unduh file terproteksi (butuh token) lalu simpan lewat browser. */
  async download(path: string, fallbackName: string): Promise<void> {
    let res: Response;
    try {
      res = await fetch(API_BASE + path, { headers: authHeaders() });
    } catch {
      throw new ApiError("Tidak dapat terhubung ke server.", 0);
    }
    if (!res.ok) {
      let msg = "Gagal mengunduh file.";
      try { msg = (await res.json())?.error?.message ?? msg; } catch { /* abaikan */ }
      throw new ApiError(msg, res.status);
    }
    const blob = await res.blob();
    let name = fallbackName;
    const cd = res.headers.get("Content-Disposition");
    const m = cd?.match(/filename\*=UTF-8''([^;]+)/i);
    if (m) { try { name = decodeURIComponent(m[1]); } catch { /* pakai fallback */ } }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  },
};
