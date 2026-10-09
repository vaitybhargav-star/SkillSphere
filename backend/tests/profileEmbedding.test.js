jest.mock("../utils/huggingfaceMatching", () => ({
  initializePipeline: jest.fn().mockResolvedValue(true),
  getEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  calculateMLSkillSimilarity: jest.fn(),
  batchCalculateSkillSimilarity: jest.fn(),
  cosineSimilarity: jest.fn(),
}));

const request = require("supertest");
const createApp = require("../app");
const connectDB = require("../config/db");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const FreelancerProfile = require("../models/FreelancerProfile");

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

describe("Freelancer profile embeddings", () => {
  test("should generate and persist skill embeddings when freelancer updates skills", async () => {
    const password = await bcrypt.hash("password123", 10);
    const user = await User.create({
      fullName: "Freelancer One",
      email: "freelancer-embed@test.com",
      password,
      role: "freelancer",
      isVerified: true,
    });

    const loginRes = await request(app).post("/api/auth/login").send({
      email: "freelancer-embed@test.com",
      password: "password123",
    });

    expect(loginRes.statusCode).toBe(200);
    const token = loginRes.body.token;
    expect(token).toBeTruthy();

    const updateRes = await request(app)
      .put("/api/profile/freelancer")
      .set("Authorization", `Bearer ${token}`)
      .send({
        skills: [
          { name: "React", level: "Expert" },
          { name: "Node.js", level: "Advanced" },
        ],
      });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.success).toBe(true);

    const savedProfile = await FreelancerProfile.findOne({ user: user._id });
    expect(savedProfile).toBeTruthy();
    expect(savedProfile.skillEmbeddings).toBeInstanceOf(Array);
    expect(savedProfile.skillEmbeddings.length).toBe(2);
    expect(savedProfile.skillEmbeddings[0]).toMatchObject({
      skill: expect.any(String),
      embedding: expect.any(Array),
    });
    expect(savedProfile.skillEmbeddings[0].embedding.length).toBeGreaterThan(0);
  });
});
