const mongoose = require("mongoose");

const freelancerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Basic Info
    title: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
    },

    location: {
      type: String,
      default: "",
    },

    // Geospatial coordinates for proximity search { type: 'Point', coordinates: [lon, lat] }
    geoLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },

    // Cached skill embeddings to avoid repeated HF calls
    // Array of { skill: String, embedding: [Number] }
    skillEmbeddings: [
      {
        skill: String,
        embedding: { type: [Number], default: [] },
      },
    ],

    hourlyRate: {
      type: Number,
      default: 0,
    },

    milestoneRate: {
      type: Number,
      default: 0,
    },

    experience: {
      type: Number,
      default: 0,
    },

    // Skills
    skills: [
      {
        name: String,
        level: {
          type: String,
          enum: ["Beginner", "Intermediate", "Advanced", "Expert"],
        },
      },
    ],

    // Languages
    languages: [
      {
        name: String,
        level: String,
      },
    ],

    // Education
    education: [
      {
        institute: String,
        degree: String,
        year: Number,
      },
    ],

    // Work Experience Timeline
    workExperience: [
      {
        company: String,
        role: String,
        startDate: Date,
        endDate: Date,
        description: String,
      },
    ],

    // Certifications
    certifications: [
      {
        title: String,
        organization: String,
        year: Number,
      },
    ],

    // Portfolio
    portfolio: [
      {
        title: String,
        description: String,
        projectLink: String,
        image: String,
      },
    ],

    // Resume
    resume: {
      type: String,
      default: "",
    },

    // Availability
    availability: {
      type: Boolean,
      default: true,
    },

    availabilitySlots: [
      {
        day: String,
        from: String,
        to: String,
      },
    ],

    // AI Matching Score
    skillScore: {
      type: Number,
      default: 0,
    },

    // Reputation
    rating: {
      type: Number,
      default: 0,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },

    completedProjects: {
      type: Number,
      default: 0,
    },

    totalEarnings: {
      type: Number,
      default: 0,
    },

    profileViews: {
      type: Number,
      default: 0,
    },

    verificationBadge: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// create geospatial index for freelancer profiles if not present
freelancerProfileSchema.index({ geoLocation: "2dsphere" });
freelancerProfileSchema.index({ title: "text", bio: "text", location: "text", "skills.name": "text" });

module.exports = mongoose.model(
  "FreelancerProfile",
  freelancerProfileSchema
);