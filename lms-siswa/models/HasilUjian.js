import mongoose from "mongoose";

const HasilUjianSchema = new mongoose.Schema(
  {
    ujian: { type: mongoose.Schema.Types.ObjectId, ref: "Ujian", required: true },
    siswa: { type: mongoose.Schema.Types.ObjectId, ref: "Siswa", required: true },
    jawaban: [{ soal: mongoose.Schema.Types.ObjectId, pilihanDipilih: Number }],
    skor: { type: Number, required: true },
    jumlahBenar: { type: Number, required: true },
    jumlahSoal: { type: Number, required: true },
    selesaiPada: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

HasilUjianSchema.index({ ujian: 1, siswa: 1 }, { unique: true });

export default mongoose.models.HasilUjian ||
  mongoose.model("HasilUjian", HasilUjianSchema);
