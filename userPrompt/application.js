import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { select, input, confirm } from "@inquirer/prompts";
import { check as checkSent } from "../sentLog.js";
import { ensureResumeExists, getSubjectAndTemplates } from "./shared.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function promptApplication() {
    console.log("\n📧  Gmail Terminal — Compose Email\n");
    console.log(`From: ${process.env.GMAIL_USER}\n`);

    const emailType = "application";

    // Company
    let company = "";
    while (!company) {
        company = await input({ message: "Company name:" });
        if (!company) console.log("  ⚠️  Company name is required.\n");
    }

    // Recipient email
    let to = "";
    while (!to) {
        to = await input({ message: "Recipient email (To):" });
        if (!to) console.log("  ⚠️  Recipient email is required.\n");
    }

    // Recipient name
    const recipientName = (await input({ message: "Recipient name (Enter for \"Hiring Team\"):", default: "Hiring Team" })).trim() || "Hiring Team";

    // Duplicate check
    const previousSend = checkSent(to, emailType);
    if (previousSend) {
        console.log(`\n  ⚠️   Already sent to ${to} on ${new Date(previousSend.sentAt).toDateString()} — Subject: "${previousSend.subject}"`);
        const again = await confirm({ message: "Send again?" });
        if (!again) {
            console.log("  Aborted.");
            process.exit(0);
        }
    }

    // Subject (auto-select from file)
    const { subjectFilePath, templatesDir } = getSubjectAndTemplates(emailType, __dirname);
    if (!fs.existsSync(subjectFilePath)) {
        console.error(`❌  Subject file not found: ${subjectFilePath}`);
        process.exit(1);
    }
    const subjects = fs.readFileSync(subjectFilePath, "utf-8")
        .split("\n")
        .map(l => l.trim())
        .filter(Boolean);
    const subject = await select({
        message: "Subject:",
        choices: subjects.map(s => ({ name: s, value: s })),
    });
    console.log(`📌  Subject: ${subject}`);

    // Extract role from subject (strip leading "Application for " / "Application to ")
    const role = subject.replace(/^application\s+(for|to)\s+/i, "").trim();

    // Template
    if (!fs.existsSync(templatesDir)) {
        console.error(`❌  templates folder not found: ${templatesDir}`);
        process.exit(1);
    }
    const templates = fs.readdirSync(templatesDir).filter(f => f.endsWith(".txt"));
    if (!templates.length) {
        console.error("❌  No .txt templates found in templates folder.");
        process.exit(1);
    }
    const chosenTemplate = await select({
        message: "Email template:",
        choices: templates.map(f => ({ name: path.basename(f, ".txt"), value: f })),
    });
    const body = fs.readFileSync(path.join(templatesDir, chosenTemplate), "utf-8").trim().replace("{name}", recipientName);

    // Follow-up date (default: 7 days from today)
    const followUpDefault = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const followUpDate = (await input({ message: `Follow-up date (Enter for ${followUpDefault}):`, default: followUpDefault })).trim() || followUpDefault;

    // Notes
    const notes = (await input({ message: "Notes (optional, Enter to skip):" })).trim();

    const resumeFile = ensureResumeExists();
    const attachments = [{ filename: path.basename(resumeFile), path: resumeFile }];

    console.log("\n─────────────────────────────────────");
    console.log(`📤  To:        ${to}`);
    console.log(`🏢  Company:   ${company}`);
    console.log(`👤  Name:      ${recipientName}`);
    console.log(`📌  Subject:   ${subject}`);
    console.log(`💼  Role:      ${role}`);
    console.log(`📅  Follow-up: ${followUpDate}`);
    console.log(`📎  Attachment: MOHIT_BHANDARI_RESUME.pdf`);
    if (notes) console.log(`📝  Notes:     ${notes}`);
    console.log("\n📝  Body:\n");
    console.log(body);
    console.log("\n─────────────────────────────────────");

    const shouldSend = await confirm({ message: "Send?" });
    if (!shouldSend) {
        console.log("Aborted.");
        process.exit(0);
    }

    return { to, subject, body, attachments, company, role, recipientName, followUpDate, notes: notes || null, type: emailType };
}

export default promptApplication;