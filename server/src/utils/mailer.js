const nodemailer = require('nodemailer');

let transporterPromise = null;

// Build (once) a transporter. If SMTP_* env vars are set, use that real SMTP
// server. Otherwise fall back to an Ethereal test account so emails are actually
// "sent" and viewable via a preview URL — no real inbox needed for the demo.
async function getTransporter() {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    if (process.env.SMTP_HOST) {
      return {
        transporter: nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === 'true',
          auth:
            process.env.SMTP_USER && process.env.SMTP_PASS
              ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
              : undefined,
        }),
        ethereal: false,
      };
    }

    // Dev fallback: Ethereal captures the message and gives a preview link.
    const testAccount = await nodemailer.createTestAccount();
    // eslint-disable-next-line no-console
    console.log('✉️  No SMTP configured — using Ethereal test inbox for emails.');
    return {
      transporter: nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      }),
      ethereal: true,
    };
  })();

  return transporterPromise;
}

async function sendMail({ to, subject, html, text }) {
  const { transporter, ethereal } = await getTransporter();
  const from = process.env.MAIL_FROM || 'AssetFlow <no-reply@assetflow.dev>';
  const info = await transporter.sendMail({ from, to, subject, html, text });

  const previewUrl = ethereal ? nodemailer.getTestMessageUrl(info) : null;
  if (previewUrl) {
    // eslint-disable-next-line no-console
    console.log(`✉️  Email preview (${to}): ${previewUrl}`);
  }
  return { messageId: info.messageId, previewUrl };
}

module.exports = { sendMail };
