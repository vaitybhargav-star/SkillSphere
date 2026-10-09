const mongoose = require("mongoose");

const evidenceItemSchema = new mongoose.Schema(
  {
    file: { type: String, required: true },
    description: { type: String, default: "" },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const responseSchema = new mongoose.Schema(
  {
    respondent: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    response: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const disputeSchema = new mongoose.Schema(
  {
    proposal: { type: mongoose.Schema.Types.ObjectId, ref: "Proposal" },
    initiator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true },
    description: { type: String, default: "" },
    evidence: [evidenceItemSchema],
    responses: [responseSchema],
    status: { type: String, enum: ["open", "under_review", "resolved", "rejected"], default: "open" },
    resolution: {
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      decision: String,
      resolution: String,
      refundPercentage: Number,
      resolvedAt: Date,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Dispute", disputeSchema);
