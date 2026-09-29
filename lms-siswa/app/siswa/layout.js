import { connectDB } from "@/lib/mongodb";
import { getCurrentSiswa } from "@/lib/currentSiswa";
import Sidebar from "@/components/Sidebar";

export default async function SiswaLayout({ children }) {
  await connectDB();
  const siswaDoc = await getCurrentSiswa();
  const siswa = siswaDoc
    ? { nama: siswaDoc.nama, nis: siswaDoc.nis }
    : null;

  return (
    <div className="flex">
      <Sidebar siswa={siswa} />
      <div className="flex-1 min-h-screen">{children}</div>
    </div>
  );
}
