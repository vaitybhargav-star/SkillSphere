const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema(
  {
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    availabilitySlots: [
      {
        dayOfWeek: {
          type: String,
          enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          required: true,
        },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        hoursAvailable: { type: Number, default: 0 },
      },
    ],

    bookedSlots: [
      {
        client: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        startDate: Date,
        endDate: Date,
        gigId: { type: mongoose.Schema.Types.ObjectId, ref: "Gig" },
        hoursPerDay: Number,
        status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "confirmed" },
        title: String,
        notes: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    events: [
      {
        date: Date,
        startDate: Date,
        endDate: Date,
        title: String,
        description: String,
        type: {
          type: String,
          enum: ["booking", "holiday", "unavailable"],
          default: "unavailable",
        },
      },
    ],

    status: {
      type: String,
      enum: ["available", "busy", "away"],
      default: "available",
    },

    timezone: { type: String, default: "UTC" },
    totalBookedHours: { type: Number, default: 0 },
    totalAvailableHours: { type: Number, default: 40 },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Availability", availabilitySchema);
