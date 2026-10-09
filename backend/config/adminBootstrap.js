const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function createDefaultAdminIfMissing() {
  const existingAdmin = await User.findOne({ role: "admin" });
  if (existingAdmin) {
    return existingAdmin;
  }

  const adminEmail = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.trim().toLowerCase() : "admin@skillsphere.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123456";
  const adminName = process.env.ADMIN_NAME || "Admin User";

  if (!adminPassword) {
    console.warn("Admin user is missing and ADMIN_PASSWORD is not configured. Skipping admin bootstrap.");
    return null;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await User.create({
    fullName: adminName,
    email: adminEmail,
    password: hashedPassword,
    role: "admin",
    isVerified: true,
    verificationBadge: true,
    status: "active",
    profileCompleted: 100,
  });

  console.log("✅ Default admin account created:");
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log("   Role: admin");

  return admin;
}

module.exports = {
  createDefaultAdminIfMissing,
};
