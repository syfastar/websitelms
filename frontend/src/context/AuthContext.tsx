import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { api, tokenStore } from "../lib/api";
import type { Role } from "../lib/types";

export type { Role } from "../lib/types";

export interface StudentProfile {
  id?: number;
  nis: string;
  class: string;
  major: string;
  majorCode: string;
}

export interface User {
  id?: number;
  name: string;
  role: Role;
  email: string;
  student?: StudentProfile;
  teacher?: { id: number; nip: string | null; subject: string | null };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** Mengembalikan null bila sukses, atau pesan error bila gagal. */
  loginWithEmail: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => tokenStore.get() !== null);

  // Pulihkan sesi dari token yang tersimpan
  useEffect(() => {
    if (!tokenStore.get()) return;
    let cancelled = false;
    api.get<User>("/auth/me")
      .then((u) => { if (!cancelled) setUser(u); })
      .catch(() => tokenStore.clear())
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Token kedaluwarsa / tidak valid -> kembali ke halaman login
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener("lumora:unauthorized", onUnauthorized);
    return () => window.removeEventListener("lumora:unauthorized", onUnauthorized);
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string): Promise<string | null> => {
    try {
      const res = await api.post<{ token: string; user: User }>("/auth/login", { email: email.trim(), password });
      tokenStore.set(res.token);
      setUser(res.user);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Login gagal.";
    }
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, loginWithEmail, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
