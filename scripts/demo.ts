import { ingestUrl, ensureTenant, cfg } from "../src/lib";

const url = process.argv[2];
if (!url) {
  console.error("usage: bun run scripts/demo.ts <url> [tenant]");
  process.exit(1);
}
const tenant = process.argv[3] ?? new URL(url).hostname.replace(/^www\./, "");

console.log(`Ingesting ${url} as tenant "${tenant}" ...`);
await ensureTenant(tenant, new URL(url).hostname);
const n = await ingestUrl(tenant, url);
console.log(`Stored ${n} chunks.`);
console.log(`Demo page: ${cfg.baseUrl}/demo/${tenant}`);
console.log(`(start the server first in another terminal: bun dev)`);
