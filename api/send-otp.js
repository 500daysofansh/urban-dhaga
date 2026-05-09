/**
 * Vercel Serverless Function — api/send-otp.js
 *
 * POST /api/send-otp
 * Body: { "to": "user@example.com", "otp": "123456" }
 *
 * Environment variables to set in Vercel dashboard
 * (Settings → Environment Variables):
 *   GMAIL_USER  →  your secondary Gmail address  e.g. urbandhage.noreply@gmail.com
 *   GMAIL_PASS  →  16-char App Password (no spaces) from myaccount.google.com/apppasswords
 *
 * How to generate a Gmail App Password:
 *   1. Go to myaccount.google.com → Security
 *   2. Enable 2-Step Verification if not already on
 *   3. Search "App passwords" → create one named "Urban Dhage OTP"
 *   4. Copy the 16-char password → paste as GMAIL_PASS in Vercel
 */

const nodemailer = require("nodemailer");

const ALLOWED_ORIGINS = [
  "https://www.urbandhage.in",
  "https://urbandhage.in",
  "http://localhost:5173",
  "http://localhost:8080",
];

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { to, otp } = req.body || {};

  if (!to || !otp) {
    return res.status(400).json({ error: "Missing 'to' or 'otp'" });
  }

  // Basic sanity checks — don't send to garbage addresses
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return res.status(400).json({ error: "Invalid email address" });
  }
  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({ error: "Invalid OTP format" });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS, // App Password, not your actual Gmail password
    },
  });

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fafafa;border-radius:12px;border:1px solid #eee">
      <h2 style="margin:0 0 8px;font-size:20px;color:#1a1a1a">Verify your email</h2>
      <p style="margin:0 0 24px;color:#555;font-size:14px">
        Use the code below to complete your <strong>Urban Dhage</strong> sign up.
        It expires in <strong>5 minutes</strong>.
      </p>
      <div style="text-align:center;letter-spacing:10px;font-size:36px;font-weight:700;color:#7c3aed;background:#f3f0ff;border-radius:8px;padding:20px 0;margin-bottom:24px">
        ${otp}
      </div>
      <p style="margin:0;color:#999;font-size:12px">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Urban Dhage" <${process.env.GMAIL_USER}>`,
      to,
      subject: `${otp} is your Urban Dhage verification code`,
      text: `Your Urban Dhage sign-up verification code is: ${otp}\n\nIt expires in 5 minutes.\n\nIf you didn't request this, ignore this email.`,
      html,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("OTP email error:", err);
    return res.status(500).json({ error: "Failed to send email. Please try again." });
  }
};
