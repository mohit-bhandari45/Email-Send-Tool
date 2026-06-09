import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { select, input, confirm } from "@inquirer/prompts";
import { check as checkSent } from "./sentLog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const EMAILS_DIR = path.join(__dirname, "emails");
const SUBJECT_FILE = path.join(__dirname, "subject.txt");
const RESUME_FILE = path.join(__dirname, "MOHIT_BHANDARI_RESUME.pdf");
const COMPANIES_FILE = path.join(__dirname, "companies.json");

async function fetchLinkedInName(url) {
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "text/html",
            },
        });
        const html = await res.text();

        // og:title is usually "First Last - Title | LinkedIn"
        const og = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/);
        if (og) return og[1].split(" - ")[0].split(" | ")[0].trim();

        const title = html.match(/<title[^>]*>([^<]+)<\/title>/);
        if (title) return title[1].split(" - ")[0].split(" | ")[0].trim();
    } catch {
        // network or parse failure — fall through to slug
    }
    return null;
}

function slugToName(url) {
    const match = url.match(/linkedin\.com\/in\/([^/?]+)/);
    if (!match) return null;
    return match[1]
        .split("-")
        .filter(p => !/\d/.test(p))
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

function extractCompanyName(url) {
    const match = url.match(/linkedin\.com\/company\/([^/?]+)/);
    return match ? match[1] : null;
}

function loadCompanies() {
    if (!fs.existsSync(COMPANIES_FILE)) return {};
    return JSON.parse(fs.readFileSync(COMPANIES_FILE, "utf-8"));
}

function saveCompanies(data) {
    fs.writeFileSync(COMPANIES_FILE, JSON.stringify(data, null, 2), "utf-8");
}

async function promptUser() {
    console.log("\n📧  Gmail Terminal — Compose Email\n");
    console.log(`From: ${process.env.GMAIL_USER}\n`);

    // Company LinkedIn
    let companyLinkedin = "";
    let companyName = "";
    while (!companyName) {
        companyLinkedin = await input({ message: "Company LinkedIn URL:" });
        companyName = extractCompanyName(companyLinkedin);
        if (!companyName) console.log("  ⚠️  Invalid LinkedIn company URL. Expected format: linkedin.com/company/<name>\n");
    }
    console.log(`  → Company: ${companyName}`);

    // Owner LinkedIn + name extraction
    let ownerLinkedin = "";
    let recipientName = "";
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

    // Owner email — used as the "To" field
    const GENERIC_ALIASES = new Set([
        "info", "contact", "hello", "team", "support", "hr", "careers", "jobs",
        "admin", "help", "sales", "marketing", "office", "general", "hire",
        "hiring", "recruit", "recruiting", "talent", "enquiries", "enquiry",
    ]);
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

    const previousSend = checkSent(to);
    if (previousSend) {
        console.log(`\n  ⚠️   Already sent to ${to} on ${new Date(previousSend.sentAt).toDateString()} — Subject: "${previousSend.subject}"`);
        const again = await confirm({ message: "Send again?" });
        if (!again) {
            console.log("  Aborted.");
            process.exit(0);
        }
    }

    // Upsert into companies.json
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

    // Subject — pick from subject.txt
    if (!fs.existsSync(SUBJECT_FILE)) {
        console.error("❌  subject.txt not found in project directory.");
        process.exit(1);
    }
    const subjects = fs.readFileSync(SUBJECT_FILE, "utf-8")
        .split("\n")
        .map(l => l.trim())
        .filter(Boolean);
    const subject = await select({
        message: "Subject:",
        choices: subjects.map(s => ({ name: s, value: s })),
    });
    console.log(`📌  Subject: ${subject}`);

    // Body — pick template from emails/
    if (!fs.existsSync(EMAILS_DIR)) {
        console.error("❌  emails/ folder not found in project directory.");
        process.exit(1);
    }
    const templates = fs.readdirSync(EMAILS_DIR).filter(f => f.endsWith(".txt"));
    if (!templates.length) {
        console.error("❌  No .txt templates found in emails/ folder.");
        process.exit(1);
    }
    const chosenTemplate = await select({
        message: "Email template:",
        choices: templates.map(f => ({ name: path.basename(f, ".txt"), value: f })),
    });
    const body = fs.readFileSync(path.join(EMAILS_DIR, chosenTemplate), "utf-8").trim().replace("{name}", recipientName);

    // Attachments — always attach resume
    if (!fs.existsSync(RESUME_FILE)) {
        console.error("❌  MOHIT_BHANDARI_RESUME.pdf not found in project directory.");
        process.exit(1);
    }
    const attachments = [{ path: RESUME_FILE }];

    // ─── Full preview ─────────────────────────────────────────────────────────

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

    return { to, subject, body, attachments, company: companyName };
}

export default promptUser;
