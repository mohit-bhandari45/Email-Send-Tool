import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.join(__dirname, "..");

const RESUME_FILE = path.join(PROJECT_DIR, "MOHIT_BHANDARI_RESUME.pdf");
const COMPANIES_FILE = path.join(PROJECT_DIR, "companies.json");

function fetchLinkedInName(url) {
    return fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html",
        },
    }).then(async res => {
        const html = await res.text();

        const og = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/);
        if (og) return og[1].split(" - ")[0].split(" |")[0].trim();

        const title = html.match(/<title[^>]*>([^<]+)<\/title>/);
        if (title) return title[1].split(" - ")[0].split(" |")[0].trim();

        return null;
    }).catch(() => null);
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

function ensureResumeExists() {
    if (!fs.existsSync(RESUME_FILE)) {
        console.error("❌  MOHIT_BHANDARI_RESUME.pdf not found in project directory.");
        process.exit(1);
    }
    return RESUME_FILE;
}

function getSubjectAndTemplates(type, baseDir) {
    if (type === "application") {
        return {
            subjectFilePath: path.join(PROJECT_DIR, "subjects", "applicationSubjects", "subject.txt"),
            templatesDir: path.join(PROJECT_DIR, "emails", "applicationEmails"),
        };
    }

    return {
        subjectFilePath: path.join(PROJECT_DIR, "subjects", "opporSubjects", "subject.txt"),
        templatesDir: path.join(PROJECT_DIR, "emails", "opporEmails"),
    };
}

function getGenericAliases() {
    return new Set([
        "info", "contact", "hello", "team", "support", "hr", "careers", "jobs",
        "admin", "help", "sales", "marketing", "office", "general", "hire",
        "hiring", "recruit", "recruiting", "talent", "enquiries", "enquiry",
    ]);
}

export {
    PROJECT_DIR,
    RESUME_FILE,
    fetchLinkedInName,
    slugToName,
    extractCompanyName,
    loadCompanies,
    saveCompanies,
    ensureResumeExists,
    getSubjectAndTemplates,
    getGenericAliases,
};