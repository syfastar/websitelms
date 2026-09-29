import mongoose from "mongoose";

const SoalSchema = new mongoose.Schema(
  {
    ujian: { type: mongoose.Schema.Types.ObjectId, ref: "Ujian", required: true },
    pertanyaan: { type: String, required: true },
    pilihan: {
      type: [String],
      required: true,
      validate: (v) => v.length >= 2,
    },
    jawabanBenar: { type: Number, required: true }, // index di array `pilihan`
    urutan: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Soal || mongoose.model("Soal", SoalSchema);
