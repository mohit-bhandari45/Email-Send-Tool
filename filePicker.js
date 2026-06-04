import fs from "fs";
import path from "path";
import os from "os";

async function pickFiles(ask) {
  const attachments = [];
  let currentDir = os.homedir();

  while (true) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      console.log(`  ⚠️  Cannot read: ${currentDir}`);
      currentDir = path.dirname(currentDir);
      continue;
    }

    const dirs = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .sort((a, b) => a.name.localeCompare(b.name));
    const files = entries
      .filter((e) => e.isFile())
      .sort((a, b) => a.name.localeCompare(b.name));

    const sep = "─".repeat(52);
    console.log(`\n📂  ${currentDir}`);
    console.log(sep);
    console.log(`  [0]  ✅  Done  (${attachments.length} file(s) selected)`);

    const parent = path.dirname(currentDir);
    if (parent !== currentDir) console.log(`  [..]  ⬆️   Go up`);

    let idx = 1;
    const dirMap = {};
    const fileMap = {};

    for (const d of dirs) {
      console.log(`  [${idx}]  📁  ${d.name}/`);
      dirMap[idx++] = path.join(currentDir, d.name);
    }
    for (const f of files) {
      const full = path.join(currentDir, f.name);
      const picked = attachments.some((a) => a.path === full);
      console.log(`  [${idx}]  ${picked ? "☑ " : "📄"}  ${f.name}`);
      fileMap[idx++] = full;
    }

    if (attachments.length) {
      console.log("\n  Selected:");
      attachments.forEach((a) => console.log(`    • ${path.basename(a.path)}`));
    }

    console.log(sep);
    const input = await ask("  Pick a number  (.. = up | cd <path> = jump | 0 = done | q = cancel): ");

    if (input.toLowerCase() === "q") return [];
    if (input === "0") return attachments;

    if (input === "..") {
      if (parent !== currentDir) currentDir = parent;
      continue;
    }

    if (input.toLowerCase().startsWith("cd ")) {
      const raw = input.slice(3).trim();
      const target =
        raw === "~" ? os.homedir()
        : raw.startsWith("~/") ? path.join(os.homedir(), raw.slice(2))
        : path.resolve(currentDir, raw);
      if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
        currentDir = target;
      } else {
        console.log(`  ⚠️  Not a directory: ${target}`);
      }
      continue;
    }

    const num = parseInt(input, 10);
    if (dirMap[num]) {
      currentDir = dirMap[num];
    } else if (fileMap[num]) {
      const fp = fileMap[num];
      const i = attachments.findIndex((a) => a.path === fp);
      if (i >= 0) {
        attachments.splice(i, 1);
        console.log(`  ➖  Removed: ${path.basename(fp)}`);
      } else {
        attachments.push({ path: fp });
        console.log(`  ✅  Added:   ${path.basename(fp)}`);
      }
    } else {
      console.log("  ⚠️  Invalid selection.");
    }
  }
}

export default pickFiles;