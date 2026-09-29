"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MENU = [
  { href: "/siswa/dashboard", label: "Dashboard", icon: "◫" },
  { href: "/siswa/materi", label: "Materi Pelajaran", icon: "📘" },
  { href: "/siswa/tugas", label: "Tugas Saya", icon: "📋" },
  { href: "/siswa/ujian", label: "Ujian & Kuis", icon: "📝" },
];

export default function Sidebar({ siswa }) {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 bg-sidebar text-white min-h-screen flex flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center font-bold">
          E
        </div>
        <div>
          <p className="font-semibold leading-tight">E-Learning</p>
          <p className="text-xs text-brand leading-tight">Lumora</p>
        </div>
      </div>

      <div className="mx-4 mb-4 rounded-lg bg-white/5 px-3 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-brand/30 flex items-center justify-center text-sm">
          🎒
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{siswa?.nama || "Siswa"}</p>
          <p className="text-xs text-brand">Siswa</p>
        </div>
      </div>

      <p className="px-5 text-[11px] tracking-wide text-white/40 mb-2">MENU</p>

      <nav className="flex-1 px-2 space-y-1">
        {MENU.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-brand-dark text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 pb-5">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-white/5">
          <span className="w-4 text-center">⏻</span>
          Keluar
        </button>
      </div>
    </aside>
  );
}
