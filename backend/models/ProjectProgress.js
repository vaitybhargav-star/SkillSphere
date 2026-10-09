const mongoose = require("mongoose");

const projectProgressSchema = new mongoose.Schema(
  {
    gig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gig",
      required: true,
    },

    proposal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Proposal",
      required: true,
    },

    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Overall progress
    overallCompletion: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Milestone tracking
    milestones: [
      {
        title: String,
        description: String,
        targetDate: Date,
        completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
        status: {
          type: String,
          enum: ["pending", "in-progress", "completed", "delayed"],
          default: "pending",
        },
        deliverables: [String],
      },
    ],

    // Progress logs
    progressLogs: [
      {
        date: { type: Date, default: Date.now },
        description: String,
        percentageCompleted: Number,
        filesUploaded: [
          {
            filename: String,
            url: String,
            uploadedAt: { type: Date, default: Date.now },
          },
        ],
        comments: String,
      },
    ],

    // Files & deliverables
    deliverables: [
      {
        title: String,
        description: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ["pending", "submitted", "approved", "rejected"],
          default: "pending",
        },
      },
    ],

    // Deadlines
    projectStartDate: Date,
    projectDeadline: Date,
    revisedDeadline: Date,
    deadlineReminderSent: { type: Boolean, default: false },

    // Issues & updates
    issues: [
      {
        title: String,
        description: String,
        severity: { type: String, enum: ["low", "medium", "high"], default: "low" },
        status: { type: String, enum: ["open", "resolved"], default: "open" },
        reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reportedAt: { type: Date, default: Date.now },
      },
    ],

    status: {
      type: String,
      enum: ["not-started", "in-progress", "on-hold", "completed", "cancelled"],
      default: "not-started",
    },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProjectProgress", projectProgressSchema);
