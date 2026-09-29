import mongoose from "mongoose";

const TugasSchema = new mongoose.Schema(
  {
    judul: { type: String, required: true },
    mataPelajaran: { type: String, required: true },
    deskripsi: { type: String },
    deadline: { type: Date, required: true },
    kelas: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Tugas || mongoose.model("Tugas", TugasSchema);
