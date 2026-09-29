import mongoose from "mongoose";

const MateriSchema = new mongoose.Schema(
  {
    judul: { type: String, required: true },
    mataPelajaran: { type: String, required: true },
    kelas: { type: String, required: true },
    ukuranFile: { type: String, required: true }, // contoh: "2.4 MB"
    fileUrl: { type: String, required: true },
    tanggalUpload: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Materi || mongoose.model("Materi", MateriSchema);
