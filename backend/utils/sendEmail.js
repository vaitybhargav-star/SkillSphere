const nodemailer = require("nodemailer");

const emailPreviewStore = [];
let cachedTransporter = null;
let cachedEtherealAccount = null;

async function createTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const service = process.env.SMTP_SERVICE;

  if (host && port && user && pass) {
    cachedTransporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: { user, pass },
      service: service || undefined,
    });
    return cachedTransporter;
  }

  if (process.env.NODE_ENV !== "production") {
    if (!cachedEtherealAccount) {
      cachedEtherealAccount = await nodemailer.createTestAccount();
    }
    cachedTransporter = nodemailer.createTransport({
      host: cachedEtherealAccount.smtp.host,
      port: cachedEtherealAccount.smtp.port,
      secure: cachedEtherealAccount.smtp.secure,
      auth: {
        user: cachedEtherealAccount.user,
        pass: cachedEtherealAccount.pass,
      },
    });
    return cachedTransporter;
  }

  return null;
}

async function sendEmail({ to, subject, html }) {
  const transporter = await createTransporter();

  if (!transporter) {
    console.warn("SMTP not configured, email not sent. Details:", { to, subject });
    return null;
  }

  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@skillsphere.com";

  const info = await transporter.sendMail({
    from: fromAddress,
    to,
    subject,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  const storedEmail = {
    to,
    subject,
    html,
    previewUrl,
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    date: new Date().toISOString(),
  };

  if (previewUrl) {
    emailPreviewStore.unshift(storedEmail);
  }

  return { ...storedEmail, info };
}

sendEmail.getPreviewEmails = () => emailPreviewStore;

module.exports = sendEmail;
