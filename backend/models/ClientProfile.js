const mongoose = require("mongoose");

const clientProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    companyName: {
      type: String,
      default: "",
    },
    companySize: {
      type: String,
      enum: ["solo", "small", "medium", "large"],
      default: "solo",
    },
    industry: {
      type: String,
      default: "",
    },
    website: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    billingAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    paymentMethods: [
      {
        type: String,
        cardLast4: String,
        isDefault: Boolean,
      },
    ],
    totalProjectsPosted: {
      type: Number,
      default: 0,
    },
    totalBudgetSpent: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    verificationStatus: {
      type: String,
      enum: ["unverified", "verified", "premium"],
      default: "unverified",
    },
    preferences: {
      preferredPaymentMethod: String,
      preferredFreelancerLevel: {
        type: String,
        enum: ["all", "beginner", "intermediate", "expert"],
        default: "all",
      },
      notificationsEmail: {
        type: Boolean,
        default: true,
      },
      notificationsSMS: {
        type: Boolean,
        default: false,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ClientProfile", clientProfileSchema);
