#!/usr/bin/env bash
# Points the Vercel production app at Cloudflare D1 (through the verotask-d1 Worker),
# publishes this branch to main, waits for the production deployment and smoke-tests it.
# Input: VERCEL_TOKEN. Reads D1_BRIDGE_SECRET from ~/.config/verotask/production-secrets.env.
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${VERCEL_TOKEN:?set VERCEL_TOKEN}"
PROJECT=prj_h3Kn3tCKkJvL5bc7bDxty9Oiod9x
TEAM=team_dmAj9JH2Yk7nMVV2d6iBrHJr
set -a; source "$HOME/.config/verotask/production-secrets.env"; set +a
export PROJECT TEAM

echo "== 1/3 Vercel environment (production + preview)"
node --input-type=module -e '
const e = process.env;
const vars = [
  ["DATABASE_BACKEND", "d1", "plain"],
  ["AUTH_STORE", "d1", "plain"],
  ["D1_STAGING_HTTP_URL", "https://verotask-d1.andrealmeidashop.workers.dev", "plain"],
  ["D1_STAGING_BRIDGE_SECRET", e.D1_BRIDGE_SECRET, "sensitive"]
];
for (const [key, value, type] of vars) {
  if (!value) throw new Error("missing " + key);
  const r = await fetch(`https://api.vercel.com/v10/projects/${e.PROJECT}/env?teamId=${e.TEAM}&upsert=true`, {
    method: "POST",
    headers: { authorization: `Bearer ${e.VERCEL_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ key, value, type, target: ["production", "preview"] })
  });
  const body = await r.json();
  if (!r.ok) throw new Error(`${key}: ${body.error?.message}`);
  console.log("   " + key + " ok");
}'

echo "== 2/3 publish to main"
before=$(date +%s)000
git push origin HEAD:main

echo "== 3/3 wait for the production deployment"
for i in $(seq 1 90); do
  state=$(curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v6/deployments?teamId=$TEAM&projectId=$PROJECT&target=production&limit=1&since=$before" \
    | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8")).deployments[0];process.stdout.write(d?d.state:"PENDING")')
  echo "   $state"
  [ "$state" = "READY" ] && break
  [ "$state" = "ERROR" ] || [ "$state" = "CANCELED" ] && { echo "deployment $state"; exit 1; }
  sleep 20
done
[ "$state" = "READY" ] || { echo "timed out waiting for Vercel"; exit 1; }
node scripts/cloudflare/smoke-production.mjs https://www.verotask.online
