# Gmail CLI — Cold Email Tool

A terminal tool for sending personalized cold emails via Gmail. Tracks companies and contacts, auto-fills the recipient's name from their LinkedIn profile, prevents duplicate sends, and attaches your resume automatically.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a `.env` file** (see `.env.example`)
   ```
   GMAIL_USER=your@gmail.com
   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
   ```
   Generate an App Password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).

3. **Add your content files** (all gitignored)

   | File / Folder | Purpose |
   |---------------|---------|
   | `emails/` | Folder of `.txt` body templates. Use `{name}` for the recipient's name. Add as many as you want — picked via arrow keys. |
   | `subject.txt` | One subject per line — shown as a selection list in the CLI. |
   | `YOUR_RESUME.pdf` | Attached automatically to every email. Update the filename in `userPrompt.js`. |

## Usage

```bash
node send.js
```

You will be prompted for:

1. **Company LinkedIn URL** — e.g. `https://linkedin.com/company/acme-corp` (name extracted from URL)
2. **Sender LinkedIn URL** — recipient's name is fetched automatically
3. **Sender Email** — used as the `To` field
4. **Subject** — pick from the list in `subject.txt` using arrow keys
5. **Email template** — pick from files in the `emails/` folder using arrow keys

A full preview of the composed email is shown before sending. Confirm with `y` to send or `n` to abort.

### Name resolution

- Tries to fetch the recipient's name from their LinkedIn public profile page.
- Falls back to parsing the URL slug (`/in/john-doe` → `John Doe`, strips trailing IDs).
- If the email is a generic alias (`info@`, `hr@`, `careers@`, etc.), the greeting is set to `Team`.

## Data files

### `companies.json` — contact store

Each run saves the company and owner details:

```json
{
  "acme-corp": {
    "companyLinkedin": "https://linkedin.com/company/acme-corp",
    "owners": [
      { "linkedin": "https://linkedin.com/in/john-doe", "email": "john@acme.com" },
      { "linkedin": "https://linkedin.com/in/jane-doe", "email": "jane@acme.com" }
    ]
  }
}
```

Duplicate owners (matched by email) are skipped.

### `sent.json` — send history

Records every successful send. Checked before each send to prevent duplicates:

```json
{
  "john@acme.com": {
    "company": "acme-corp",
    "subject": "Full-Stack Developer – Exploring Opportunities",
    "sentAt": "2026-06-04T10:32:00.000Z"
  }
}
```

If the email was sent before, you'll see:

```
⚠️  Already sent to john@acme.com on Wed Jun 04 2026 — Subject: "..."
Send again? (y/n):
```

## Gitignored files

```
.env
companies.json
sent.json
emails/
subject.txt
*.pdf
```
