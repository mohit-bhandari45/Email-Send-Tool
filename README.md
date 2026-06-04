# Gmail CLI — Cold Email Tool

A terminal tool for sending personalized cold emails via Gmail. Tracks companies and contacts in a local JSON file, auto-fills the recipient's name from their LinkedIn profile, and attaches your resume automatically.

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

   | File | Purpose |
   |------|---------|
   | `email.txt` | Email body. Use `{name}` where the recipient's name should appear. |
   | `subject.txt` | Single line — used as the email subject. |
   | `YOUR_RESUME.pdf` | Attached automatically to every email. Update the filename in `userPrompt.js`. |

## Usage

```bash
node send.js
```

You will be prompted for:

1. **Company LinkedIn URL** — e.g. `https://linkedin.com/company/acme-corp`
2. **Sender LinkedIn URL** — the person you're emailing; their name is extracted automatically
3. **Sender Email** — used as the `To` field

Subject and body are loaded from `subject.txt` and `email.txt`. No other input needed.

### Name resolution

- Tries to fetch the recipient's name from their LinkedIn public profile page.
- Falls back to parsing the URL slug (`/in/john-doe` → `John Doe`).
- If the email is a generic alias (`info@`, `hr@`, `careers@`, etc.), the greeting is set to `Team` instead of a name.

## Company tracking

Each run upserts into `companies.json`:

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

Duplicate owners (matched by email) are skipped rather than duplicated.

## Gitignored files

```
.env
companies.json
email.txt
subject.txt
*.pdf
```
