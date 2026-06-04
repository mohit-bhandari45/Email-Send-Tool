import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SENT_FILE = path.join(__dirname, "sent.json");

function load() {
    if (!fs.existsSync(SENT_FILE)) return {};
    return JSON.parse(fs.readFileSync(SENT_FILE, "utf-8"));
}

function check(email) {
    return load()[email] ?? null;
}

function record({ email, company, subject }) {
    const sent = load();
    sent[email] = { company, subject, sentAt: new Date().toISOString() };
    fs.writeFileSync(SENT_FILE, JSON.stringify(sent, null, 2), "utf-8");
}

export { check, record };
