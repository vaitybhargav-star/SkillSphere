const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    gig: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    status: { type: String, enum: ["pending", "paid", "refunded"], default: "pending" },
    provider: { type: String, default: "mock" },
    paymentReference: { type: String },
    providerData: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
    
    // Escrow fields
    escrowStatus: { type: String, enum: ["held", "released", "disputed", "refunded"], default: "held" },
    relatedMilestoneId: { type: mongoose.Schema.Types.ObjectId, ref: "ProjectProgress" },
    releaseDate: Date,
    escrowHeldDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
