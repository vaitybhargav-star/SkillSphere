const mongoose = require("mongoose");

const gigSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, default: "General" },

    // Budget & pricing
    budget: { type: Number, required: true },
    budgetType: { type: String, enum: ["fixed", "hourly"], default: "fixed" },
    minBudget: Number,
    maxBudget: Number,

    // Location-based search
    location: { type: String, default: "" },
    geoLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: [Number], // [longitude, latitude]
    },
    radius: { type: Number, default: 50 }, // Search radius in km

    // Skills required
    skills: { type: [String], default: [] },

    // Cached skill embeddings similar to freelancer profiles
    skillEmbeddings: [
      {
        skill: String,
        embedding: { type: [Number], default: [] },
      },
    ],
    requiredExperience: { type: String, enum: ["beginner", "intermediate", "expert"], default: "beginner" },

    // Experience level filter
    minRating: { type: Number, default: 0, min: 0, max: 5 },
    minProjects: { type: Number, default: 0 },

    // Client info
    client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Status & timeline
    status: { type: String, enum: ["open", "in-progress", "closed"], default: "open" },
    deadline: Date,
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },

    // Approval workflow
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvalNotes: String,
    rejectionReason: String,

    // Milestones
    milestones: [
      {
        title: String,
        description: String,
        amount: Number,
        paymentAmount: Number, // Payment amount to release when milestone is completed
        dueDate: Date,
      },
    ],

    // Attachments
    attachments: { type: [String], default: [] },

    // Client invitations
    invitedFreelancers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Proposals
    proposals: [{ type: mongoose.Schema.Types.ObjectId, ref: "Proposal" }],
    acceptedProposal: { type: mongoose.Schema.Types.ObjectId, ref: "Proposal" },

    // Analytics
    viewCount: { type: Number, default: 0 },
    proposalCount: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Create geospatial index for location-based search
gigSchema.index({ geoLocation: "2dsphere" });

// Create text index for search
gigSchema.index({ title: "text", description: "text", skills: "text" });

module.exports = mongoose.model("Gig", gigSchema);
