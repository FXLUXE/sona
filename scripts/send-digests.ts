// Send the weekly owner digest ("here's what your receptionist did") to every claimed
// tenant with a notification email. Schedule weekly:  bun scripts/send-digests.ts
// Requires RESEND_API_KEY (and a verified sending domain) to actually deliver.
import { tenantsForDigest, sendWeeklyDigest } from "../src/lib";

const tenants = await tenantsForDigest();
let sent = 0;
for (const t of tenants as any[]) {
  const r = await sendWeeklyDigest(t.slug, t.name ?? t.slug, t.lead_notify_email);
  if (r.sent) sent++;
}
console.log(`Weekly digest: sent ${sent}/${tenants.length}.`);
