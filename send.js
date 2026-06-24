#!/usr/bin/env node

import "dotenv/config";
import promptUser from "./userPrompt.js";
import sendEmail from "./sendEmail.js";
import { record as recordSent } from "./sentLog.js";

// ─── Credentials Check ────────────────────────────────────────────────────────

if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
  console.error(`
❌  Missing credentials!

Create a .env file in this folder:
  GMAIL_USER=your@gmail.com
  GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

Get an App Password at: https://myaccount.google.com/apppasswords
`);
  process.exit(1);
}

(async () => {
  const data = await promptUser();
  await sendEmail(data);
  // recordSent will route to the proper log file based on `type`
  recordSent({ email: data.to, company: data.company, subject: data.subject, type: data.type, recipientName: data.recipientName });
})();