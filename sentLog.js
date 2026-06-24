import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = path.join(__dirname, "logs");
const APP_FILE = path.join(LOGS_DIR, "sent_applications.json");
const OPP_FILE = path.join(LOGS_DIR, "sent_opportunities.json");

function ensureLogsDir() {
    if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
}

function loadFile(filePath) {
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function saveFile(filePath, data) {
    ensureLogsDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function check(email, type) {
    // Require an explicit type to avoid cross-log fallbacks.
    if (!type) return null;

    if (type === "application") {
        const app = loadFile(APP_FILE);
        if (app[email]) return { ...app[email], type: "application" };
        return null;
    }

    if (type === "opportunity") {
        const opp = loadFile(OPP_FILE);
        if (opp[email]) return { ...opp[email], type: "opportunity" };
        return null;
    }

    return null;
}

function record({ email, company = null, subject, type = "opportunity", recipientName = null }) {
    const sentAt = new Date().toISOString();
    const d = new Date(sentAt);
    const month = d.toLocaleString("en-GB", { month: "long" }).toLowerCase();
    const sentDate = `${d.getDate()} ${month}, ${d.getFullYear()}`; // e.g. "14 march, 2026"

    if (type === "application") {
        const app = loadFile(APP_FILE);
        app[email] = { subject, recipientName, sentAt, sentDate };
        saveFile(APP_FILE, app);
    } else {
        const opp = loadFile(OPP_FILE);
        opp[email] = { company, subject, recipientName, sentAt, sentDate };
        saveFile(OPP_FILE, opp);
    }
}

export { check, record };
