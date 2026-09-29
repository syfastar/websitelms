export default function Topbar({ section, siswa }) {
  return (
    <div className="flex items-center justify-between px-8 py-4 border-b bg-white">
      <p className="text-sm text-gray-400">
        E-Learning Lumora <span className="mx-1">/</span>
        <span className="text-gray-700">{section}</span>
      </p>
      <div className="flex items-center gap-4">
        <span className="relative text-lg">
          🔔
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            3
          </span>
        </span>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center">
            🎒
          </div>
          <div className="leading-tight">
            <p className="text-sm font-medium">{siswa?.nama || "Siswa"}</p>
            <p className="text-xs text-brand">Siswa</p>
          </div>
        </div>
      </div>
    </div>
  );
}
