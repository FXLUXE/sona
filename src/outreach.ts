// outreach.ts — personalized cold-outreach copy for the demo-led play: each prospect gets a
// link to a live Sona receptionist ALREADY trained on their own site. The demo is the pitch.
//
// Honest + UK-PECR/CAN-SPAM aware: B2B only, sender identified, every message carries a real
// opt-out line. This module only BUILDS the messages — sending is done by the founder from
// their own account (account-gated by design; we never send unattended).

export type Prospect = { name?: string; url: string; email?: string; vertical?: string };

const host = (u: string) => {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; }
};

// A friendly business label from the prospect (their name, else their domain).
function label(p: Prospect): string {
  if (p.name && p.name.trim()) return p.name.trim();
  const h = host(p.url);
  const base = h.split(".")[0] || h;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

// Two subject lines to A/B; both lead with the value (a thing already built for them).
export function subjectLines(p: Prospect): string[] {
  const biz = label(p);
  return [
    `A 24/7 receptionist for ${biz} — quick look?`,
    `${biz}: never miss another after-hours enquiry`,
  ];
}

// The body. Warm, human, specific — written NOT to sound AI/templated. No call/booking ask
// (the product is self-serve). `senderName`/`senderEmail` identify us (PECR) + opt-out line.
export function emailBody(p: Prospect, demoUrl: string, senderName = "Daniel", senderEmail = "daniel@sona.app"): string {
  const biz = label(p);
  return (
`Hi${p.name ? " " + biz : ""},

I set up little assistants that sit on a business's website and answer customer questions day or night — so you stop losing people who get in touch after hours.

I've already made one for ${biz}, trained on your own site, so you can just try it rather than picture it: ${demoUrl}

Ask it what a customer would — your hours, what you offer, where you are. If it doesn't know something, it takes their details instead of guessing, so a late-night visitor still becomes a lead instead of a missed call.

If it's useful it takes a few minutes to add to your site. If it's not for you, genuinely no worries.

${senderName}
${senderEmail}

(Not for you? Just reply "stop" and that's the last you'll hear from me.)`
  );
}

// A short LinkedIn version (you paste it — LinkedIn can't be automated without your account).
export function linkedinMessage(p: Prospect, demoUrl: string): string {
  const biz = label(p);
  return (
`Hi — I build little website assistants for businesses like ${biz}, and I made one for yours off your site. It answers visitors' questions in your words: ${demoUrl} — have a look if you fancy, no signup. If it's not useful, all good!`
  );
}

// Short, lighter second touch (send ~3 days later if no reply).
export function followUpBody(p: Prospect, demoUrl: string, senderName = "Daniel"): string {
  const biz = label(p);
  return (
`Hi again,

Just making sure the live demo I built for ${biz} reached you — it answers your visitors' questions from your own site, day or night: ${demoUrl}

Worth a 60-second look. If it's not for you, reply "stop" and I'll leave it there.

${senderName}, Sona`
  );
}

// Everything needed to send one prospect, ready to paste into any email tool.
export function buildOutreach(p: Prospect, demoUrl: string, sender?: { name?: string; email?: string }) {
  const subjects = subjectLines(p);
  return {
    to: p.email ?? "",
    business: label(p),
    website: p.url,
    demoUrl,
    subject: subjects[0],
    subjectAlt: subjects[1],
    body: emailBody(p, demoUrl, sender?.name, sender?.email),
    followUp: followUpBody(p, demoUrl, sender?.name),
  };
}
