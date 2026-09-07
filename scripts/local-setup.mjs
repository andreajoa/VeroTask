import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, chmodSync, mkdirSync } from "node:fs";

const file = new URL("../.env.local", import.meta.url);
let content = existsSync(file) ? readFileSync(file, "utf8") : "# Local VeroTask configuration. Never commit.\n";
function setMissing(key, value) {
  const pattern = new RegExp(`^${key}=(.*)$`, "m");
  const current = content.match(pattern);
  if (current?.[1]?.trim()) return current[1].trim();
  if (current) content = content.replace(pattern, `${key}=${value}`);
  else content += `\n${key}=${value}\n`;
  return value;
}
const password = setMissing("LOCAL_POSTGRES_PASSWORD", randomBytes(24).toString("hex"));
setMissing("DATABASE_URL", `postgresql://verotask:${password}@127.0.0.1:5446/verotask`);
setMissing("DATABASE_DRIVER", "postgres");
setMissing("NEXT_PUBLIC_APP_URL", "http://localhost:3046");
setMissing("LOCAL_EMAIL", "true");
setMissing("STORAGE_DRIVER", "local");
setMissing("SMTP_URL", "smtp://127.0.0.1:1026");
setMissing("EMAIL_FROM", "VeroTask <notifications@verotask.local>");
setMissing("AI_PROVIDER", "rules");
for (const name of ["AUTH_SECRET", "CRON_SECRET", "ADMIN_SESSION_SECRET", "AUDIT_ENCRYPTION_KEY", "AUDIT_HASH_SECRET", "UNSUBSCRIBE_SECRET"]) {
  setMissing(name, randomBytes(32).toString("hex"));
}
if (!content.match(/^ADMIN_PASSWORD_HASH=.+$/m)) {
  const adminPassword = randomBytes(18).toString("base64url");
  const salt = randomBytes(16);
  const hash = scryptSync(adminPassword, salt, 64).toString("hex");
  setMissing("ADMIN_PASSWORD_HASH", `scrypt:${salt.toString("hex")}:${hash}`);
  mkdirSync(new URL("../.local", import.meta.url), { recursive: true });
  writeFileSync(new URL("../.local/admin-password.txt", import.meta.url), adminPassword + "\n", { mode: 0o600 });
}
// Colons survive Next.js dotenv expansion and Node's --env-file equally.
content = content.replace(/^ADMIN_PASSWORD_HASH=scrypt\$([a-f0-9]+)\$([a-f0-9]+)$/m, "ADMIN_PASSWORD_HASH=scrypt:$1:$2");
writeFileSync(file, content, { mode: 0o600 });
chmodSync(file, 0o600);
console.log("Local configuration ready. Existing values were preserved. Start services with npm run local:up.");
