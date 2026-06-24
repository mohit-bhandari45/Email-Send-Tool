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

function check(email) {
    const app = loadFile(APP_FILE);
    if (app[email]) return { ...app[email], type: "application" };
    const opp = loadFile(OPP_FILE);
    if (opp[email]) return { ...opp[email], type: "opportunity" };
    return null;
}

function record({ email, company = null, subject, type = "opportunity", recipientName = null }) {
    const sentAt = new Date().toISOString();
    if (type === "application") {
        const app = loadFile(APP_FILE);
        app[email] = { subject, recipientName, sentAt };
        saveFile(APP_FILE, app);
    } else {
        const opp = loadFile(OPP_FILE);
        opp[email] = { company, subject, recipientName, sentAt };
        saveFile(OPP_FILE, opp);
    }
}

export { check, record };
