import nodemailer from "nodemailer";

async function sendEmail({ to, subject, body, attachments }) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const mailOptions = {
    from: `"${process.env.SENDER_NAME}" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text: body,
    ...(attachments.length > 0 && { attachments }),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅  Email sent! Message ID: ${info.messageId}`);
  } catch (err) {
    console.error(`❌  Failed to send: ${err.message}`);
    if (err.message.includes("Invalid login")) {
      console.error(`\n💡  Tip: Make sure you're using an App Password, not your real Gmail password.`);
      console.error(`   Generate one at: https://myaccount.google.com/apppasswords\n`);
    }
    process.exit(1);
  }
}

export default sendEmail;