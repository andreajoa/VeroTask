#!/usr/bin/env bash
# VeroTask production on Cloudflare (Workers + D1 + R2), replacing Vercel/Neon.
#
# Inputs (environment): CLOUDFLARE_API_TOKEN (or a prior `npx wrangler login`),
#   STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY,
#   ADMIN_PANEL_PASSWORD, optional MAPS_API_KEY.
# Generated secrets persist in ~/.config/verotask/production-secrets.env (mode 600) so
# re-running never rotates sessions, audit keys or unsubscribe links by accident.
#
#   bash scripts/cloudflare/deploy-production.sh            # D1 + both Workers on workers.dev, then smoke test
#   bash scripts/cloudflare/deploy-production.sh --cutover  # also attach www.verotask.online + apex
set -euo pipefail
cd "$(dirname "$0")/../.."

export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-7ef2450965811249288bc35188f7cbf9}"
DB_NAME=verotask-production
OPS_URL=https://verotask-d1.andrealmeidashop.workers.dev
APP_PREVIEW_URL=https://verotask.andrealmeidashop.workers.dev
WR="npx wrangler"

for v in STRIPE_SECRET_KEY STRIPE_PUBLISHABLE_KEY STRIPE_WEBHOOK_SECRET RESEND_API_KEY ADMIN_PANEL_PASSWORD; do
  [ -n "${!v:-}" ] || { echo "missing $v"; exit 1; }
done

secrets_file="$HOME/.config/verotask/production-secrets.env"
mkdir -p "$(dirname "$secrets_file")"; umask 077
if [ ! -f "$secrets_file" ]; then
  {
    echo "AUTH_SECRET=$(openssl rand -hex 32)"
    echo "ADMIN_SESSION_SECRET=$(openssl rand -hex 32)"
    echo "AUDIT_ENCRYPTION_KEY=$(openssl rand -hex 32)"
    echo "AUDIT_HASH_SECRET=$(openssl rand -hex 32)"
    echo "UNSUBSCRIBE_SECRET=$(openssl rand -hex 32)"
    echo "CRON_SECRET=$(openssl rand -hex 32)"
    echo "UPLOAD_SIGNING_SECRET=$(openssl rand -hex 32)"
    echo "D1_BRIDGE_SECRET=$(openssl rand -hex 32)"
  } > "$secrets_file"
fi
# Export them: the Node helper below builds the Worker secret JSON from process.env.
set -a
# shellcheck disable=SC1090
source "$secrets_file"
set +a

echo "== 1/6 D1 database"
DB_ID=$($WR d1 list --json | node -e "const l=JSON.parse(require('fs').readFileSync(0,'utf8'));const d=l.find(x=>x.name==='$DB_NAME');process.stdout.write(d?d.uuid:'')")
if [ -z "$DB_ID" ]; then
  $WR d1 create "$DB_NAME" --location enam >/dev/null
  DB_ID=$($WR d1 list --json | node -e "const l=JSON.parse(require('fs').readFileSync(0,'utf8'));process.stdout.write(l.find(x=>x.name==='$DB_NAME').uuid)")
fi
echo "   $DB_NAME = $DB_ID"
TABLES=$($WR d1 execute "$DB_NAME" --remote --json --command "SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_cf_KV' AND name != 'd1_migrations'" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8'))[0].results[0].n))")
if [ "$TABLES" = "0" ]; then
  for f in cloudflare/d1/0*.sql cloudflare/d1/seeds/0001_public_unclaimed_from_original_source.sql; do
    echo "   applying $f"; $WR d1 execute "$DB_NAME" --remote --yes --file "$f" >/dev/null
  done
else
  echo "   schema already present ($TABLES tables) — not reapplied"
fi

tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
sed "s/__VEROTASK_PRODUCTION_D1_ID__/$DB_ID/" cloudflare/wrangler.production.toml > cloudflare/.wrangler.production.rendered.toml
sed -e "s/__VEROTASK_PRODUCTION_D1_ID__/$DB_ID/" -e "s/__STRIPE_PUBLISHABLE_KEY__/$STRIPE_PUBLISHABLE_KEY/" wrangler.production.json > .wrangler.production.rendered.json

echo "== 2/6 operations Worker (verotask-d1)"
$WR deploy --config cloudflare/.wrangler.production.rendered.toml >/dev/null
printf '{"DB_BRIDGE_SECRET":"%s","CRON_SECRET":"%s"}' "$D1_BRIDGE_SECRET" "$CRON_SECRET" > "$tmp/ops.json"
$WR secret bulk "$tmp/ops.json" --config cloudflare/.wrangler.production.rendered.toml >/dev/null
curl -fsS "$OPS_URL/health"; echo

echo "== 3/6 app build (vinext)"
export NEXT_PUBLIC_APP_URL=https://www.verotask.online NEXT_PUBLIC_APP_NAME=VeroTask NEXT_PUBLIC_SUPPORT_EMAIL=verotask@proton.me
export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="$STRIPE_PUBLISHABLE_KEY"
npm run -s build:vinext >/dev/null
# Wrangler 4.15x refuses to deploy while .cloudflare/output exists (it expects `cf deploy`),
# so deploy the same bundle from dist-worker/ instead.
rm -rf dist-worker && cp -R .cloudflare/output/v0/workers/default dist-worker && rm -rf .cloudflare/output

echo "== 4/6 app Worker (verotask)"
ADMIN_PASSWORD_HASH=$(ADMIN_PANEL_PASSWORD="$ADMIN_PANEL_PASSWORD" node -e "const c=require('crypto');const s=c.randomBytes(16);process.stdout.write('scrypt\$'+s.toString('hex')+'\$'+c.scryptSync(process.env.ADMIN_PANEL_PASSWORD,s,64).toString('hex'))")
node -e "
const e=process.env;const o={STRIPE_SECRET_KEY:e.STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET:e.STRIPE_WEBHOOK_SECRET,RESEND_API_KEY:e.RESEND_API_KEY,
AUTH_SECRET:e.AUTH_SECRET,ADMIN_SESSION_SECRET:e.ADMIN_SESSION_SECRET,ADMIN_PASSWORD_HASH:process.argv[1],AUDIT_ENCRYPTION_KEY:e.AUDIT_ENCRYPTION_KEY,
AUDIT_HASH_SECRET:e.AUDIT_HASH_SECRET,UNSUBSCRIBE_SECRET:e.UNSUBSCRIBE_SECRET,CRON_SECRET:e.CRON_SECRET,UPLOAD_SIGNING_SECRET:e.UPLOAD_SIGNING_SECRET,
D1_STAGING_BRIDGE_SECRET:e.D1_BRIDGE_SECRET};const missing=Object.keys(o).filter(k=>!o[k]);if(missing.length){console.error('missing secrets: '+missing.join(', '));process.exit(1)}if(e.MAPS_API_KEY)o.MAPS_API_KEY=e.MAPS_API_KEY;
require('fs').writeFileSync(process.argv[2],JSON.stringify(o),{mode:0o600})" "$ADMIN_PASSWORD_HASH" "$tmp/app.json"
$WR deploy --config .wrangler.production.rendered.json >/dev/null
$WR secret bulk "$tmp/app.json" --config .wrangler.production.rendered.json >/dev/null

echo "== 5/6 smoke test on workers.dev"
node scripts/cloudflare/smoke-production.mjs "$APP_PREVIEW_URL"

if [ "${1:-}" = "--cutover" ]; then
  echo "== 6/6 attach www.verotask.online and verotask.online"
  : "${CLOUDFLARE_DNS_TOKEN:?set CLOUDFLARE_DNS_TOKEN (Zone DNS Edit + Workers Routes Edit for verotask.online)}"
  node scripts/cloudflare/cutover-domains.mjs
  node scripts/cloudflare/smoke-production.mjs https://www.verotask.online
else
  echo "== 6/6 skipped: run again with --cutover after reviewing $APP_PREVIEW_URL"
fi
rm -f cloudflare/.wrangler.production.rendered.toml .wrangler.production.rendered.json
