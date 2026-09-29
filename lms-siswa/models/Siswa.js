import mongoose from "mongoose";

const SiswaSchema = new mongoose.Schema(
  {
    nama: { type: String, required: true },
    nis: { type: String, required: true, unique: true },
    kelas: { type: String, required: true },
    jurusan: { type: String, required: true },
    status: { type: String, default: "Aktif" },
    semester: { type: String, required: true },
    avatarUrl: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Siswa || mongoose.model("Siswa", SiswaSchema);
