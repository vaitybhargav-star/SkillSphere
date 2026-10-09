const requiredInProduction = [
  "MONGO_URI",
  "JWT_SECRET",
];

function validateEnv() {
  if (process.env.NODE_ENV !== "production") {
    // In dev/test, warn if important vars are missing but don't exit
    requiredInProduction.forEach((v) => {
      if (!process.env[v]) {
        console.warn(`Warning: ${v} is not set`);
      }
    });

    const optionalVars = [
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_USER",
      "SMTP_PASS",
      "EMAIL_FROM",
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "STRIPE_SECRET",
      "STRIPE_WEBHOOK_SECRET",
      "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
      "CLOUDINARY_URL",
    ];

    optionalVars.forEach((v) => {
      if (!process.env[v]) {
        console.warn(`Note: ${v} is not configured. Some features will be disabled.`);
      }
    });

    return;
  }

  const missing = requiredInProduction.filter((v) => !process.env[v]);
  if (missing.length) {
    throw new Error(
      `Missing required environment variables for production: ${missing.join(", ")}`
    );
  }
}

module.exports = validateEnv;
