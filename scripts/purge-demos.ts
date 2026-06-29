// Purge stale anonymous demo tenants (denial-of-wallet + storage hygiene).
// Run on a schedule, e.g. daily:  bun scripts/purge-demos.ts [days]
// On Railway/Render add it as a cron job; locally run manually.
import { purgeOldDemos } from "../src/lib";

const days = Number(process.argv[2]) || 14;
const res = await purgeOldDemos(days);
console.log(`Purged ${res.purged} demo tenant(s) older than ${days}d:`, res.slugs);
