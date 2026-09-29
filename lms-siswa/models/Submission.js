import mongoose from "mongoose";

const SubmissionSchema = new mongoose.Schema(
  {
    tugas: { type: mongoose.Schema.Types.ObjectId, ref: "Tugas", required: true },
    siswa: { type: mongoose.Schema.Types.ObjectId, ref: "Siswa", required: true },
    status: {
      type: String,
      enum: ["Belum Dikumpulkan", "Sedang Dikerjakan", "Sudah Dikumpulkan"],
      default: "Belum Dikumpulkan",
    },
    isiJawaban: { type: String }, // teks jawaban atau link file yang dikumpulkan
    nilai: { type: Number },
    dikumpulkanPada: { type: Date },
  },
  { timestamps: true }
);

SubmissionSchema.index({ tugas: 1, siswa: 1 }, { unique: true });

export default mongoose.models.Submission ||
  mongoose.model("Submission", SubmissionSchema);
