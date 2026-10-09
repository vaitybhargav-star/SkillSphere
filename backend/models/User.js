const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
    },

    phone: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
    },

    location: {
      city: {
        type: String,
        default: "",
      },
      state: {
        type: String,
        default: "",
      },
      country: {
        type: String,
        default: "",
      },
    },

    profileImage: {
      type: String,
      default: "",
    },

    coverImage: {
      type: String,
      default: "",
    },

    role: {
      type: String,
      enum: ["client", "freelancer", "admin"],
      default: "client",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    googleId: {
      type: String,
      default: "",
      index: true,
      sparse: true,
    },

    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    twoFactorSecret: {
      type: String,
      default: "",
    },

    twoFactorTempSecret: {
      type: String,
      default: "",
    },

    verificationBadge: {
      type: Boolean,
      default: false,
    },

    verificationRequested: {
      type: Boolean,
      default: false,
    },

    profileCompleted: {
      type: Number,
      default: 20,
      min: 0,
      max: 100,
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    lastSeen: {
      type: Date,
      default: Date.now,
    },

    lastLogin: Date,

    notificationEnabled: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: ["active", "suspended", "blocked"],
      default: "active",
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    skills: {
      type: [String],
      default: [],
    },

    hourlyRate: {
      type: Number,
      default: 0,
    },

    experience: {
      type: Number,
      default: 0,
    },

    availability: {
      type: Boolean,
      default: true,
    },

    portfolio: {
      type: [String],
      default: [],
    },

    // Payout fields
    bankAccountId: String,
    stripeConnectId: String,
    payoutPreferences: {
      method: { type: String, enum: ["bank_transfer", "stripe_connect"], default: "bank_transfer" },
      autoWithdraw: { type: Boolean, default: false },
      autoWithdrawThreshold: { type: Number, default: 100 }, // Minimum amount to trigger auto-withdrawal
    },

    // Reputation & Review Stats
    reviewerStats: {
      totalReviewsGiven: { type: Number, default: 0 },
      averageReviewQuality: { type: Number, default: 0 }, // 0-1 scale
      credibilityScore: { type: Number, default: 0.5, min: 0, max: 1 }, // Increases with quality reviews
      reviewerBadge: { type: String, default: "NEW" }, // NEW, ESTABLISHED, BRONZE, SILVER, GOLD, PLATINUM
    },

    reputationStats: {
      averageRating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
      verifiedReviews: { type: Number, default: 0 },
      reputationBadge: { type: String, default: "NEW" }, // NEW, ESTABLISHED, BRONZE, SILVER, GOLD, PLATINUM
      trustScore: { type: Number, default: 0 }, // 0-100
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);