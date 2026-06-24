import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { select, input, confirm } from "@inquirer/prompts";
import { check as checkSent } from "../sentLog.js";
import {
    fetchLinkedInName,
    slugToName,
    extractCompanyName,
    loadCompanies,
    saveCompanies,
    ensureResumeExists,
    getSubjectAndTemplates,
    getGenericAliases,
} from "./shared.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function promptOpportunity() {
    console.log("\n📧  Gmail Terminal — Compose Email\n");
    console.log(`From: ${process.env.GMAIL_USER}\n`);

    const emailType = "opportunity";
    let companyLinkedin = "";
    let companyName = "";
    let ownerLinkedin = "";
    let recipientName = "there";

    while (!companyName) {
        companyLinkedin = await input({ message: "Company LinkedIn URL:" });
        companyName = extractCompanyName(companyLinkedin);
        if (!companyName) console.log("  ⚠️  Invalid LinkedIn company URL. Expected format: linkedin.com/company/<name>\n");
    }
    console.log(`  → Company: ${companyName}`);

    while (!ownerLinkedin) {
        ownerLinkedin = await input({ message: "Sender LinkedIn URL:" });
        if (!ownerLinkedin) { console.log("  ⚠️  Sender LinkedIn URL is required.\n"); continue; }
        process.stdout.write("  → Fetching name from LinkedIn...");
        const detectedName = await fetchLinkedInName(ownerLinkedin) ?? slugToName(ownerLinkedin);
        if (detectedName) {
            console.log(` ${detectedName}`);
            const nameOk = await confirm({ message: `  Use "${detectedName}" as recipient name?`, default: true });
            recipientName = nameOk ? detectedName : await input({ message: "  Enter recipient name:" }) || "there";
        } else {
            console.log(" (could not extract)");
            recipientName = await input({ message: "  Enter recipient name (leave blank for 'there'):" }) || "there";
        }
    }

    const GENERIC_ALIASES = getGenericAliases();
    let to = "";
    while (!to) {
        to = await input({ message: "Sender Email (To):" });
        if (!to) console.log("  ⚠️  Sender email is required.\n");
    }
    const localPart = to.split("@")[0].toLowerCase();
    if (GENERIC_ALIASES.has(localPart)) {
        recipientName = "Team";
        console.log(`  → Generic email detected — greeting set to "Team"`);
    }

    const previousSend = checkSent(to, emailType);
    if (previousSend) {
        console.log(`\n  ⚠️   Already sent to ${to} on ${new Date(previousSend.sentAt).toDateString()} — Subject: "${previousSend.subject}"`);
        const again = await confirm({ message: "Send again?" });
        if (!again) {
            console.log("  Aborted.");
            process.exit(0);
        }
    }

    const companies = loadCompanies();
    if (companies[companyName]) {
        const alreadyExists = companies[companyName].owners.some(o => o.email === to);
        if (!alreadyExists) {
            companies[companyName].owners.push({ linkedin: ownerLinkedin, email: to });
            console.log(`\n  ✅  Added new owner to existing company "${companyName}"`);
        } else {
            console.log(`\n  ℹ️   Owner ${to} already recorded under "${companyName}"`);
        }
    } else {
        companies[companyName] = {
            companyLinkedin,
            owners: [{ linkedin: ownerLinkedin, email: to }],
        };
        console.log(`\n  ✅  New company "${companyName}" saved`);
    }
    saveCompanies(companies);

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

    const resumeFile = ensureResumeExists();
    const attachments = [{ filename: path.basename(resumeFile), path: resumeFile }];

    console.log("\n─────────────────────────────────────");
    console.log(`📤  To:      ${to}`);
    console.log(`📌  Subject: ${subject}`);
    console.log(`📎  Attachment: MOHIT_BHANDARI_RESUME.pdf`);
    console.log("\n📝  Body:\n");
    console.log(body);
    console.log("\n─────────────────────────────────────");

    const shouldSend = await confirm({ message: "Send?" });
    if (!shouldSend) {
        console.log("Aborted.");
        process.exit(0);
    }

    return { to, subject, body, attachments, company: companyName, type: emailType, recipientName };
}

export default promptOpportunity;