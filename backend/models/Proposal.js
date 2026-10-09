const mongoose = require("mongoose");

const proposalSchema = new mongoose.Schema(
  {
    gig: { type: mongoose.Schema.Types.ObjectId, ref: "Gig", required: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    proposalText: { type: String, required: true },
    bidAmount: { type: Number, required: true },
    estimatedTime: { type: String, default: "7 days" },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
    negotiationHistory: [
      {
        sender: { type: String, enum: ["client", "freelancer"], required: true },
        message: String,
        bidAmount: Number,
        estimatedTime: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    counterOfferAmount: Number,
    counterEstimatedTime: String,
    lastNegotiationMessage: String,
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Proposal", proposalSchema);
