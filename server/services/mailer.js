const nodemailer = require('nodemailer');

// Booking notifications always go to this address (per project requirement).
const NOTIFICATION_RECIPIENT = 'vinitskaple@gmail.com';
let transporter; // undefined = not initialised, null = not configured

function getTransporter() {
  if (transporter !== undefined) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_USER || !SMTP_PASS || SMTP_USER.startsWith('your_') || SMTP_PASS.startsWith('your_')) {
    transporter = null;
    return null;
  }
  const port = Number(SMTP_PORT) || 465;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

const html = `<!doctype html><html><body style="margin:0;padding:32px 12px;background:#f3f5f4;font-family:Segoe UI,Arial,sans-serif;">
<table role="presentation" align="center" width="460" style="max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e9e7;">
<tr><td style="background:#0c2a2e;padding:22px 28px;color:#e9d7a8;font-size:13px;letter-spacing:.4px;">Hotel Booking &amp; Occupancy Analytics</td></tr>
<tr><td style="padding:34px 28px 10px;text-align:center;">
<div style="width:56px;height:56px;line-height:56px;border-radius:50%;background:#e3f3f1;color:#0f766e;font-size:28px;margin:0 auto 16px;">&#10003;</div>
<h1 style="margin:0 0 10px;font-size:26px;color:#14231f;">Thank You!</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:#4b5d57;">A new hotel booking has been successfully recorded in the system.</p>
</td></tr>
<tr><td style="padding:18px 28px 34px;text-align:center;"><span style="display:inline-block;padding:9px 18px;border-radius:999px;background:#0f766e;color:#ffffff;font-size:14px;">Booking confirmed successfully</span></td></tr>
<tr><td style="padding:14px 28px;background:#f8faf9;text-align:center;font-size:12px;color:#7a8a85;">Hotel Management System</td></tr>
</table></body></html>`;

async function sendBookingNotification() {
  const t = getTransporter();
  if (!t) {
    console.warn('[mail] SMTP is not configured in server/.env - booking email skipped.');
    return { sent: false };
  }
  await t.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: NOTIFICATION_RECIPIENT,
    subject: 'Thank you - new booking confirmed',
    text: 'Thank You! A new hotel booking has been successfully recorded in the Hotel Booking & Occupancy Analytics System. Booking confirmed successfully. - Hotel Management System',
    html,
  });
  console.log('[mail] Booking notification sent.');
  return { sent: true };
}

module.exports = { sendBookingNotification };
