const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    gig: { type: mongoose.Schema.Types.ObjectId, ref: "Gig" },
    proposal: { type: mongoose.Schema.Types.ObjectId, ref: "Proposal" },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reviewee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Multi-dimensional ratings
    rating: { type: Number, min: 1, max: 5, required: true }, // Overall rating
    qualityRating: { type: Number, min: 1, max: 5 }, // Quality of work
    communicationRating: { type: Number, min: 1, max: 5 }, // Communication
    deadlineRating: { type: Number, min: 1, max: 5 }, // Met deadlines
    professionalismRating: { type: Number, min: 1, max: 5 }, // Professionalism

    comment: { type: String, default: "" },

    // Verification & trust
    verified: { type: Boolean, default: false }, // Verified review (auto-set if transaction verified)
    transactionVerified: { type: Boolean, default: false }, // Actual transaction completed
    transactionAmount: Number,

    // Fraud detection
    flaggedAsFraud: { type: Boolean, default: false },
    fraudConfidence: { type: Number, default: 0, min: 0, max: 1 }, // 0-1 confidence score
    fraudReasons: [String], // ["suspicious_timing", "identical_to_other_review", "mismatched_skills", etc]
    reportedAsInappropriate: { type: Boolean, default: false },

    // Weight calculation (internal)
    reviewWeight: { type: Number, default: 1 }, // 0-1, affects reputation score
    weightFactors: {
      reviewerReputation: { type: Number, default: 0.7 }, // Higher rep = higher weight
      reviewLength: { type: Number, default: 0.2 }, // Longer reviews weighted more
      detailLevel: { type: Number, default: 0.1 }, // Specific details vs generic
    },

    // Review analytics
    helpfulVotes: { type: Number, default: 0 },
    unhelpfulVotes: { type: Number, default: 0 },
    helpfulnessScore: { 
      type: Number, 
      default: 0, 
      get: function() {
        const totalVotes = this.helpfulVotes + this.unhelpfulVotes;
        if (totalVotes === 0) return 0;
        return (this.helpfulVotes / totalVotes * 100).toFixed(2);
      }
    },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true, toJSON: { getters: true } }
);

module.exports = mongoose.model("Review", reviewSchema);
