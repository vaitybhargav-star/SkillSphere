/**
 * Professional seed script - Add realistic professional data
 * Run: node backend/scripts/seedProfessionalData.js
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Gig = require("../models/Gig");
const Review = require("../models/Review");

async function seedProfessionalData() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGO_URI || "mongodb://localhost:27017/SkillSphere";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await Gig.deleteMany({});
    await Review.deleteMany({});
    console.log("🗑️  Cleared existing data");

    // Professional client users
    const clients = [
      {
        fullName: "Sarah Anderson",
        email: "sarah.anderson@techcorp.com",
        password: await bcrypt.hash("Secure@Pass123", 10),
        role: "client",
        phone: "+1-555-0101",
        bio: "Project Manager at Tech Corp. Looking for skilled freelancers.",
        isVerified: true,
        profileImage: "https://via.placeholder.com/150?text=SA",
      },
      {
        fullName: "Michael Chen",
        email: "michael.chen@startups.io",
        password: await bcrypt.hash("Secure@Pass123", 10),
        role: "client",
        phone: "+1-555-0102",
        bio: "CTO at Innovative Startups. Building amazing products.",
        isVerified: true,
        profileImage: "https://via.placeholder.com/150?text=MC",
      },
      {
        fullName: "Emma Rodriguez",
        email: "emma.rodriguez@design.co",
        password: await bcrypt.hash("Secure@Pass123", 10),
        role: "client",
        phone: "+1-555-0103",
        bio: "Design Director seeking UX/UI expertise.",
        isVerified: true,
        profileImage: "https://via.placeholder.com/150?text=ER",
      },
    ];

    // Professional freelancer users
    const freelancers = [
      {
        fullName: "James Mitchell",
        email: "james.mitchell@freelance.dev",
        password: await bcrypt.hash("Secure@Pass123", 10),
        role: "freelancer",
        phone: "+1-555-0201",
        bio: "Full-stack developer with 8+ years of experience. Specializing in React, Node.js, and MongoDB.",
        isVerified: true,
        profileImage: "https://via.placeholder.com/150?text=JM",
        skills: ["React", "Node.js", "MongoDB", "JavaScript", "TypeScript"],
        hourlyRate: 85,
        experience: 8,
        title: "Senior Full-Stack Developer",
        verificationBadge: true,
      },
      {
        fullName: "Sofia Petrov",
        email: "sofia.petrov@designer.com",
        password: await bcrypt.hash("Secure@Pass123", 10),
        role: "freelancer",
        phone: "+1-555-0202",
        bio: "UI/UX Designer with 6 years of experience. Creating beautiful and functional digital experiences.",
        isVerified: true,
        profileImage: "https://via.placeholder.com/150?text=SP",
        skills: ["Figma", "UI Design", "UX Design", "Prototyping", "Wireframing"],
        hourlyRate: 75,
        experience: 6,
        title: "Senior UI/UX Designer",
        verificationBadge: true,
      },
      {
        fullName: "David Kumar",
        email: "david.kumar@marketing.pro",
        password: await bcrypt.hash("Secure@Pass123", 10),
        role: "freelancer",
        phone: "+1-555-0203",
        bio: "Digital marketing expert. SEO, SEM, and content strategy specialist.",
        isVerified: true,
        profileImage: "https://via.placeholder.com/150?text=DK",
        skills: ["SEO", "SEM", "Content Marketing", "Analytics", "Social Media"],
        hourlyRate: 65,
        experience: 7,
        title: "Digital Marketing Strategist",
        verificationBadge: true,
      },
      {
        fullName: "Jessica Wang",
        email: "jessica.wang@data.science",
        password: await bcrypt.hash("Secure@Pass123", 10),
        role: "freelancer",
        phone: "+1-555-0204",
        bio: "Data scientist with expertise in machine learning and AI. Python, TensorFlow, PyTorch.",
        isVerified: true,
        profileImage: "https://via.placeholder.com/150?text=JW",
        skills: ["Python", "Machine Learning", "Data Analysis", "TensorFlow", "SQL"],
        hourlyRate: 95,
        experience: 5,
        title: "Senior Data Scientist",
        verificationBadge: true,
      },
    ];

    // Create users
    const createdClients = await User.insertMany(clients);
    const createdFreelancers = await User.insertMany(freelancers);
    console.log(`✅ Created ${createdClients.length} clients`);
    console.log(`✅ Created ${createdFreelancers.length} freelancers`);

    // Professional gigs
    const gigs = [
      {
        title: "E-commerce Platform Development",
        description:
          "Build a modern e-commerce platform with React frontend and Node.js backend. Must support payments, inventory management, and analytics.",
        budget: 8000,
        category: "Web Development",
        skills: ["React", "Node.js", "MongoDB", "Stripe"],
        client: createdClients[0]._id,
        status: "open",
        milestones: 3,
        documents: [],
        applications: 0,
      },
      {
        title: "Mobile App UI/UX Design",
        description:
          "Design a beautiful and intuitive mobile app interface for a fitness tracking application. Include wireframes, prototypes, and design system.",
        budget: 4500,
        category: "Design",
        skills: ["Figma", "UI Design", "UX Design", "Prototyping"],
        client: createdClients[1]._id,
        status: "open",
        milestones: 2,
        documents: [],
        applications: 0,
      },
      {
        title: "SEO Optimization & Content Strategy",
        description:
          "Comprehensive SEO audit and content strategy for SaaS platform. Target keywords research, optimization recommendations, and 20 blog post outlines.",
        budget: 3000,
        category: "Marketing",
        skills: ["SEO", "Content Marketing", "Keyword Research"],
        client: createdClients[2]._id,
        status: "open",
        milestones: 4,
        documents: [],
        applications: 0,
      },
      {
        title: "Machine Learning Model Development",
        description:
          "Develop and train a machine learning model for predictive analytics. Dataset provided. Model should achieve >90% accuracy.",
        budget: 6000,
        category: "Data Science",
        skills: ["Python", "Machine Learning", "Data Analysis"],
        client: createdClients[0]._id,
        status: "open",
        milestones: 5,
        documents: [],
        applications: 0,
      },
    ];

    const createdGigs = await Gig.insertMany(gigs);
    console.log(`✅ Created ${createdGigs.length} professional gigs`);

    // Professional reviews
    const reviews = [
      {
        gig: createdGigs[0]._id,
        client: createdClients[0]._id,
        freelancer: createdFreelancers[0]._id,
        rating: 5,
        comment:
          "Excellent work! James delivered the project on time with high quality code. Very professional and communicative.",
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        gig: createdGigs[1]._id,
        client: createdClients[1]._id,
        freelancer: createdFreelancers[1]._id,
        rating: 5,
        comment:
          "Sofia's design work was exceptional. The UI is intuitive and beautiful. Highly recommended!",
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      },
      {
        gig: createdGigs[2]._id,
        client: createdClients[2]._id,
        freelancer: createdFreelancers[2]._id,
        rating: 4,
        comment:
          "David provided valuable insights for our SEO strategy. Results are already showing improvement.",
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      },
    ];

    const createdReviews = await Review.insertMany(reviews);
    console.log(`✅ Created ${createdReviews.length} professional reviews`);

    console.log("\n✅ Professional data seeding completed successfully!");
    console.log("\n📋 Sample Credentials:");
    console.log("\nClients:");
    console.log("  • sarah.anderson@techcorp.com / Secure@Pass123");
    console.log("  • michael.chen@startups.io / Secure@Pass123");
    console.log("  • emma.rodriguez@design.co / Secure@Pass123");
    console.log("\nFreelancers:");
    console.log("  • james.mitchell@freelance.dev / Secure@Pass123 (Full-Stack Dev)");
    console.log("  • sofia.petrov@designer.com / Secure@Pass123 (UI/UX Designer)");
    console.log("  • david.kumar@marketing.pro / Secure@Pass123 (Marketer)");
    console.log("  • jessica.wang@data.science / Secure@Pass123 (Data Scientist)");

    await mongoose.connection.close();
  } catch (error) {
    console.error("❌ Seeding Error:", error.message);
    process.exit(1);
  }
}

seedProfessionalData();
