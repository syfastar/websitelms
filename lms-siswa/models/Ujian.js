import mongoose from "mongoose";

const UjianSchema = new mongoose.Schema(
  {
    judul: { type: String, required: true },
    mataPelajaran: { type: String, required: true },
    kelas: { type: String, required: true },
    tanggal: { type: Date, required: true },
    durasiMenit: { type: Number, required: true },
    jumlahSoal: { type: Number, required: true },
  },
  { timestamps: true }
);

// Status "Tersedia" / "Mendatang" dihitung otomatis dari tanggal,
// bukan disimpan, supaya tidak perlu di-update manual tiap hari.
UjianSchema.methods.getStatus = function () {
  return new Date(this.tanggal) <= new Date() ? "Tersedia" : "Mendatang";
};

export default mongoose.models.Ujian || mongoose.model("Ujian", UjianSchema);
