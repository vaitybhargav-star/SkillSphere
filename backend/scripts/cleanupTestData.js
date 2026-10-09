/**
 * Cleanup script - Remove all test/dummy data from MongoDB
 * Run: node backend/scripts/cleanupTestData.js
 */

const mongoose = require("mongoose");
const User = require("../models/User");
const Gig = require("../models/Gig");
const Proposal = require("../models/Proposal");
const Review = require("../models/Review");
const Payment = require("../models/Payment");

async function cleanupTestData() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGO_URI || "mongodb://localhost:27017/SkillSphere";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Delete test users (emails containing "test", "auto", or "demo")
    const testUserPatterns = [
      /test/i,
      /auto/i,
      /demo/i,
      /fake/i,
      /sample/i,
      /example\.com/i,
    ];

    let deletedUsers = 0;
    const users = await User.find();

    for (const user of users) {
      for (const pattern of testUserPatterns) {
        if (pattern.test(user.email) || pattern.test(user.fullName)) {
          await User.findByIdAndDelete(user._id);
          deletedUsers++;
          console.log(`🗑️  Deleted test user: ${user.fullName} (${user.email})`);
          break;
        }
      }
    }

    // Delete gigs with test content
    let deletedGigs = 0;
    const gigs = await Gig.find();

    for (const gig of gigs) {
      for (const pattern of testUserPatterns) {
        if (pattern.test(gig.title) || pattern.test(gig.description)) {
          await Gig.findByIdAndDelete(gig._id);
          deletedGigs++;
          console.log(`🗑️  Deleted test gig: ${gig.title}`);
          break;
        }
      }
    }

    // Delete orphaned proposals, reviews, payments
    const validUsers = await User.find().select("_id");
    const validUserIds = validUsers.map((u) => u._id);

    let deletedProposals = await Proposal.deleteMany({
      freelancer: { $nin: validUserIds },
    });
    console.log(`🗑️  Deleted ${deletedProposals.deletedCount} orphaned proposals`);

    let deletedReviews = await Review.deleteMany({
      reviewer: { $nin: validUserIds },
    });
    console.log(`🗑️  Deleted ${deletedReviews.deletedCount} orphaned reviews`);

    let deletedPayments = await Payment.deleteMany({
      client: { $nin: validUserIds },
    });
    console.log(`🗑️  Deleted ${deletedPayments.deletedCount} orphaned payments`);

    console.log("\n✅ Cleanup Complete!");
    console.log(`   • Deleted ${deletedUsers} test users`);
    console.log(`   • Deleted ${deletedGigs} test gigs`);
    console.log(`   • Deleted ${deletedProposals.deletedCount} orphaned proposals`);
    console.log(`   • Deleted ${deletedReviews.deletedCount} orphaned reviews`);
    console.log(`   • Deleted ${deletedPayments.deletedCount} orphaned payments`);

    await mongoose.connection.close();
    console.log("\n🟢 Database cleanup finished successfully!");
  } catch (error) {
    console.error("❌ Cleanup Error:", error.message);
    process.exit(1);
  }
}

cleanupTestData();
