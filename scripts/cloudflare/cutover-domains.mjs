#!/usr/bin/env node
// Moves www.verotask.online and verotask.online from Vercel to the `verotask` Worker.
// Needs CLOUDFLARE_DNS_TOKEN with Zone DNS Edit + Workers Routes Edit on verotask.online.
// The old Vercel deployment stays untouched, so rollback = recreate the two records
// printed below and delete the Worker custom domains.
const token = process.env.CLOUDFLARE_DNS_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID || "7ef2450965811249288bc35188f7cbf9";
const zoneName = "verotask.online";
const hosts = ["www.verotask.online", "verotask.online"];
const api = async (path, init = {}) => {
  const response = await fetch("https://api.cloudflare.com/client/v4" + path, {
    ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers || {}) }
  });
  const body = await response.json();
  if (!body.success) throw new Error(`${path}: ${JSON.stringify(body.errors)}`);
  return body.result;
};

const [zone] = await api(`/zones?name=${zoneName}`);
for (const host of hosts) {
  const records = await api(`/zones/${zone.id}/dns_records?name=${host}`);
  for (const record of records.filter((r) => ["A", "AAAA", "CNAME"].includes(r.type))) {
    console.log(`rollback record: ${record.type} ${record.name} ${record.content} proxied=${record.proxied}`);
    await api(`/zones/${zone.id}/dns_records/${record.id}`, { method: "DELETE" });
  }
  await api(`/accounts/${account}/workers/domains`, {
    method: "PUT",
    body: JSON.stringify({ hostname: host, service: "verotask", environment: "production", zone_id: zone.id })
  });
  console.log(`attached ${host} -> verotask Worker`);
}
