const mongoose = require("mongoose");

const payoutSchema = new mongoose.Schema(
  {
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "BankAccount" },
    payoutMethod: {
      type: String,
      enum: ["bank_transfer", "stripe_connect"],
      default: "bank_transfer",
    },
    requestDate: { type: Date, default: Date.now },
    completionDate: Date,
    transactionId: String,
    failureReason: String,
    currency: { type: String, default: "USD" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payout", payoutSchema);
