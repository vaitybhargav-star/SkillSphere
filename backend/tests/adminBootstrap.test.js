const connectDB = require("../config/db");
const mongoose = require("mongoose");
const User = require("../models/User");
const { createDefaultAdminIfMissing } = require("../config/adminBootstrap");

jest.setTimeout(20000);

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.ADMIN_EMAIL = "bootstrap-admin@test.com";
  process.env.ADMIN_PASSWORD = "Bootstrap@123";
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (connectDB.__mongod) {
    await connectDB.__mongod.stop();
  }
});

describe("Admin bootstrap", () => {
  test("should create a default admin user when none exists", async () => {
    await User.deleteMany({ role: "admin" });

    const admin = await createDefaultAdminIfMissing();

    expect(admin).toBeTruthy();
    expect(admin.role).toBe("admin");
    expect(admin.email).toBe("bootstrap-admin@test.com");
    expect(admin.isVerified).toBe(true);
    expect(admin.status).toBe("active");

    const stored = await User.findOne({ email: "bootstrap-admin@test.com" });
    expect(stored).toBeTruthy();
    expect(stored.role).toBe("admin");
  });

  test("should not create a second admin if one already exists", async () => {
    const firstAdmin = await createDefaultAdminIfMissing();
    const secondAdmin = await createDefaultAdminIfMissing();

    expect(secondAdmin._id.toString()).toBe(firstAdmin._id.toString());
    const admins = await User.find({ role: "admin" });
    expect(admins.length).toBe(1);
  });
});
