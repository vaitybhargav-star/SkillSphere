/**
 * Database Initialization & Index Setup
 * Run after MongoDB connection to ensure proper indexes
 */

const Gig = require("../models/Gig");
const FreelancerProfile = require("../models/FreelancerProfile");
const User = require("../models/User");
const Review = require("../models/Review");
const Message = require("../models/Message");
const Proposal = require("../models/Proposal");
const Payment = require("../models/Payment");
const Notification = require("../models/Notification");

async function ensureIndex(collection, spec, options = {}) {
  const existingIndexes = await collection.indexes();
  const sameSpec = existingIndexes.find((idx) => JSON.stringify(idx.key) === JSON.stringify(spec));
  if (sameSpec) {
    console.log(`⚠️ Index already exists on ${collection.collectionName} with key ${JSON.stringify(spec)}; skipping creation.`);
    return;
  }

  const isTextIndex = Object.values(spec).some((value) => value === "text");
  if (isTextIndex) {
    const existingTextIndex = existingIndexes.find((idx) => Object.values(idx.key).some((value) => value === "text"));
    if (existingTextIndex) {
      console.log(`⚠️ A text index already exists on ${collection.collectionName} (${existingTextIndex.name}); skipping additional text index creation.`);
      return;
    }
  }

  await collection.createIndex(spec, options);
}

async function initializeIndexes() {
  try {
    console.log("🔧 Initializing database indexes...");

    // Gig indexes for search and filtering
    await ensureIndex(Gig.collection, { title: "text", description: "text", skills: "text", category: "text" });
    await ensureIndex(Gig.collection, { status: 1, createdAt: -1 });
    await ensureIndex(Gig.collection, { client: 1 });
    await ensureIndex(Gig.collection, { budget: 1 });
    await ensureIndex(Gig.collection, { location: 1 });
    await ensureIndex(Gig.collection, { skills: 1 });
    await ensureIndex(Gig.collection, { geoLocation: "2dsphere" });
    console.log("✅ Gig indexes created");

    // Freelancer Profile indexes
    await ensureIndex(FreelancerProfile.collection, { "skills.name": 1 });
    await ensureIndex(FreelancerProfile.collection, { hourlyRate: 1 });
    await ensureIndex(FreelancerProfile.collection, { experience: 1 });
    await ensureIndex(FreelancerProfile.collection, { location: 1 });
    await ensureIndex(FreelancerProfile.collection, { rating: -1 });
    await ensureIndex(FreelancerProfile.collection, { user: 1 });
    console.log("✅ Freelancer Profile indexes created");

    // User indexes
    await ensureIndex(User.collection, { email: 1 }, { unique: true });
    await ensureIndex(User.collection, { role: 1 });
    await ensureIndex(User.collection, { status: 1 });
    await ensureIndex(User.collection, { createdAt: -1 });
    console.log("✅ User indexes created");

    // Review indexes
    await ensureIndex(Review.collection, { reviewee: 1 });
    await ensureIndex(Review.collection, { reviewer: 1 });
    await ensureIndex(Review.collection, { createdAt: -1 });
    console.log("✅ Review indexes created");

    // Message indexes for chat
    await ensureIndex(Message.collection, { sender: 1, receiver: 1 });
    await ensureIndex(Message.collection, { createdAt: -1 });
    await ensureIndex(Message.collection, { read: 1 });
    console.log("✅ Message indexes created");

    // Proposal indexes
    await ensureIndex(Proposal.collection, { gig: 1 });
    await ensureIndex(Proposal.collection, { freelancer: 1 });
    await ensureIndex(Proposal.collection, { status: 1 });
    console.log("✅ Proposal indexes created");

    // Payment indexes
    await ensureIndex(Payment.collection, { user: 1 });
    await ensureIndex(Payment.collection, { freelancer: 1 });
    await ensureIndex(Payment.collection, { status: 1 });
    await ensureIndex(Payment.collection, { createdAt: -1 });
    console.log("✅ Payment indexes created");

    // Notification indexes
    await ensureIndex(Notification.collection, { user: 1 });
    await ensureIndex(Notification.collection, { read: 1 });
    await ensureIndex(Notification.collection, { createdAt: -1 });
    console.log("✅ Notification indexes created");

    console.log("✨ All database indexes initialized successfully!");
    return true;
  } catch (error) {
    console.error("❌ Error initializing indexes:", error.message);
    return false;
  }
}

module.exports = { initializeIndexes };
