const request = require("supertest");
const createApp = require("../app");
const connectDB = require("../config/db");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const FreelancerProfile = require("../models/FreelancerProfile");
const Gig = require("../models/Gig");

jest.setTimeout(20000);

let app;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret";
  await connectDB();
  app = createApp();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (connectDB.__mongod) {
    await connectDB.__mongod.stop();
  }
});

describe("Matching routes", () => {
  test("should return recommended freelancers for a client gig", async () => {
    const clientPassword = await bcrypt.hash("clientpass", 10);
    const client = await User.create({
      fullName: "Client User",
      email: "client-match@test.com",
      password: clientPassword,
      role: "client",
      isVerified: true,
    });

    const freelancerPassword = await bcrypt.hash("freelancerpass", 10);
    const freelancer = await User.create({
      fullName: "Freelancer Match",
      email: "freelancer-match@test.com",
      password: freelancerPassword,
      role: "freelancer",
      isVerified: true,
    });

    await FreelancerProfile.create({
      user: freelancer._id,
      title: "Senior React Developer",
      bio: "Experienced React engineer",
      skills: [
        { name: "React", level: "Expert" },
        { name: "Node.js", level: "Advanced" },
      ],
      hourlyRate: 45,
      experience: 5,
      rating: 4.8,
      totalReviews: 12,
      geoLocation: { type: "Point", coordinates: [77.5946, 12.9716] },
    });

    const gig = await Gig.create({
      title: "React Developer Needed",
      description: "Build a performant React dashboard",
      category: "Web Development",
      budget: 1200,
      budgetType: "fixed",
      location: "Bangalore",
      geoLocation: { type: "Point", coordinates: [77.5946, 12.9716] },
      radius: 50,
      skills: ["React", "Node.js"],
      client: client._id,
      approvalStatus: "approved",
      status: "open",
    });

    const loginRes = await request(app).post("/api/auth/login").send({
      email: "client-match@test.com",
      password: "clientpass",
    });

    expect(loginRes.statusCode).toBe(200);
    const token = loginRes.body.token;
    expect(token).toBeTruthy();

    const response = await request(app)
      .get(`/api/matching/recommend/${gig._id}?useML=false&limit=5`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.recommendedFreelancers)).toBe(true);
    expect(response.body.data.recommendedFreelancers.length).toBeGreaterThanOrEqual(1);
    expect(response.body.data.recommendedFreelancers[0]).toMatchObject({
      name: "Freelancer Match",
      title: "Senior React Developer",
    });
  });
});
