// legal.ts — Privacy Policy + Terms of Service pages. Stripe requires both before taking
// payments, and Sona stores visitor PII (emails, phones, chat transcripts) so GDPR demands
// a clear controller/processor split, sub-processor list, and data-rights statement.
//
// NOTE: baseline written for the product as built. Operator + jurisdiction are now filled in
// (Daniel Heads, England & Wales). If Sona later incorporates as a Ltd, update OPERATOR + add the
// company number and registered office.

const COMPANY = "Sona";
const OPERATOR = "Daniel Heads"; // sole operator, United Kingdom — update if incorporated
const CONTACT = "privacy@asksona.co.uk";
const UPDATED = "30 June 2026";

function esc(s: any): string {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

function page(base: string, title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — ${esc(COMPANY)}</title>
<meta name="robots" content="index,follow">
<style>
  :root{--ink:#11212b;--brass:#c79a4b;--paper:#f6f1e9;--muted:#5b6670;--line:#e4dccb}
  *{box-sizing:border-box}
  body{margin:0;background:var(--paper);color:var(--ink);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.65}
  .wrap{max-width:760px;margin:0 auto;padding:40px 24px 80px}
  a{color:#a87f33}
  header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:18px;margin-bottom:8px}
  .logo{font-weight:800;font-size:20px}.logo span{color:var(--brass)}
  .back{font-size:14px;font-weight:600;text-decoration:none}
  h1{font-size:30px;letter-spacing:-.02em;margin:28px 0 4px}
  .updated{color:var(--muted);font-size:14px;margin:0 0 24px}
  h2{font-size:19px;margin:30px 0 8px}
  p,li{color:#2c3942;font-size:15.5px}
  ul{padding-left:20px}
  table{width:100%;border-collapse:collapse;margin:12px 0;font-size:14.5px}
  th,td{border:1px solid var(--line);padding:9px 11px;text-align:left;vertical-align:top}
  th{background:#efe8da}
  footer{margin-top:48px;border-top:1px solid var(--line);padding-top:18px;color:var(--muted);font-size:13px}
</style></head>
<body><div class="wrap">
<header><div class="logo">${esc(COMPANY)}<span>.</span></div><a class="back" href="${esc(base)}/">← Back to site</a></header>
${bodyHtml}
<footer>Questions? Email <a href="mailto:${esc(CONTACT)}">${esc(CONTACT)}</a>. · <a href="${esc(base)}/privacy">Privacy</a> · <a href="${esc(base)}/terms">Terms</a></footer>
</div></body></html>`;
}

export function privacyHtml(base: string): string {
  const body = `
<h1>Privacy Policy</h1>
<p class="updated">Last updated ${esc(UPDATED)}</p>

<p>${esc(COMPANY)} is a service operated by ${esc(OPERATOR)}, based in the United Kingdom ("we", "us"). We provide an AI assistant that businesses ("Customers") embed on their own websites to answer visitor questions and capture enquiries. This policy explains what we collect and how we handle it. For data that website visitors submit through a Customer's assistant, the Customer is the data <strong>controller</strong> and we act as their <strong>processor</strong>; for Customer account data, we are the controller and you can reach us at <a href="mailto:${esc(CONTACT)}">${esc(CONTACT)}</a>.</p>

<h2>1. Information we collect</h2>
<ul>
  <li><strong>Customer account data:</strong> your email and authentication identifiers (via magic-link sign-in), business name, and settings.</li>
  <li><strong>Content you connect:</strong> the public web pages and facts you ask us to ingest to train your assistant.</li>
  <li><strong>Visitor data (on your behalf):</strong> chat messages, and any contact details a visitor chooses to provide (name, email, phone), booking requests, and a page URL.</li>
  <li><strong>Usage + billing data:</strong> conversation counts, feature usage, and payment status (card details are handled by Stripe, not stored by us).</li>
</ul>

<h2>2. How we use it</h2>
<ul>
  <li>To run the assistant: retrieve answers from your content, hold a conversation, and capture and route leads to you.</li>
  <li>To send you lead alerts and (if enabled) a weekly activity summary.</li>
  <li>To operate billing, prevent abuse, and improve reliability.</li>
</ul>
<p>We do <strong>not</strong> sell personal data, and we do not use your or your visitors' content to train our own models.</p>

<h2>3. Sub-processors</h2>
<p>We rely on the following providers to deliver the service:</p>
<table>
  <tr><th>Provider</th><th>Purpose</th></tr>
  <tr><td>Supabase</td><td>Database + authentication hosting</td></tr>
  <tr><td>Google (Gemini API)</td><td>Language model + embeddings. On Google's paid API tier, inputs are not used to train Google's models.</td></tr>
  <tr><td>Stripe</td><td>Subscription billing + card processing</td></tr>
  <tr><td>Resend</td><td>Transactional + alert email</td></tr>
  <tr><td>Twilio</td><td>SMS lead alerts (optional)</td></tr>
</table>
<p>Some of these providers may process data outside the UK/EEA. Where they do, we rely on appropriate safeguards (such as the provider's UK/EU Standard Contractual Clauses and equivalent transfer mechanisms) to protect your data.</p>

<h2>4. Cookies &amp; local storage</h2>
<p>The dashboard uses local storage to keep you signed in. The embedded assistant stores a random session identifier in the visitor's browser to maintain conversation continuity. We do not use third-party advertising or tracking cookies.</p>

<h2>5. Data retention &amp; deletion</h2>
<p>We keep data for as long as your account is active. Customers can export or permanently delete all data held about a specific visitor email directly from the dashboard (Subject Access &amp; erasure). Anonymous trial/demo data is purged automatically after a short period. To close your account and delete your data, email <a href="mailto:${esc(CONTACT)}">${esc(CONTACT)}</a>.</p>

<h2>6. Your rights</h2>
<p>Depending on your location (including under GDPR/UK GDPR), you may have rights to access, correct, export, or delete personal data, and to object to or restrict processing. Visitors should direct such requests to the business whose assistant they used; that business can service the request from its dashboard. Account holders can contact us directly.</p>
<p>If you are in the UK, you also have the right to lodge a complaint with the Information Commissioner's Office (ICO) at <a href="https://ico.org.uk">ico.org.uk</a>; we'd appreciate the chance to address your concern first.</p>

<h2>7. Security</h2>
<p>Data is encrypted in transit. Access is restricted by per-tenant membership checks, and server-side requests are guarded against access to internal resources. No method is perfectly secure, but we work to protect your data.</p>

<h2>8. Changes</h2>
<p>We may update this policy; material changes will be reflected by the "last updated" date above.</p>`;
  return page(base, "Privacy Policy", body);
}

export function termsHtml(base: string): string {
  const body = `
<h1>Terms of Service</h1>
<p class="updated">Last updated ${esc(UPDATED)}</p>

<p>These terms govern your use of ${esc(COMPANY)} (the "Service"), a service operated by ${esc(OPERATOR)}, based in the United Kingdom. By creating an account or using the Service, you agree to them.</p>

<h2>1. The service</h2>
<p>${esc(COMPANY)} lets you train an AI assistant on your website's content and embed it to answer visitor questions and capture leads. Answers are generated from the content you provide; while we aim for accuracy, the assistant may occasionally be incomplete or wrong, and you are responsible for the content you connect and the claims it makes.</p>

<h2>2. Accounts</h2>
<p>You must provide accurate information, keep your sign-in secure, and are responsible for activity under your account. You must have the right to use and ingest any website content you connect.</p>

<h2>3. Acceptable use</h2>
<ul>
  <li>Don't use the Service unlawfully, to harass, or to generate harmful, deceptive, or infringing content.</li>
  <li>Don't attempt to break, overload, reverse-engineer, or gain unauthorised access to the Service or other tenants' data.</li>
  <li>Don't ingest content you don't have rights to, or collect personal data without a lawful basis and appropriate notice to visitors.</li>
</ul>

<h2>4. Billing</h2>
<p>Paid plans are billed in advance on a recurring basis through Stripe at the price shown at checkout, until cancelled. A free trial may be offered; we may require a payment method to continue after it. Fees are non-refundable except where required by law. You can cancel anytime from the dashboard's billing portal; access continues until the end of the paid period.</p>

<h2>5. Your data</h2>
<p>You retain ownership of your content and the visitor data your assistant collects. You grant us the limited rights needed to operate the Service for you. Our handling of personal data is described in the <a href="${esc(base)}/privacy">Privacy Policy</a>.</p>

<h2>6. Availability</h2>
<p>We work to keep the Service available but provide it "as is" without guarantees of uninterrupted operation. We may modify or discontinue features with reasonable notice.</p>

<h2>7. Disclaimer &amp; liability</h2>
<p>To the maximum extent permitted by law, the Service is provided without warranties, and our total liability for any claim is limited to the amount you paid us in the three months before the claim. We are not liable for indirect or consequential losses, including lost business from missed or incorrect assistant responses.</p>

<h2>8. Termination</h2>
<p>You may stop using the Service and cancel at any time. We may suspend or terminate accounts that violate these terms.</p>

<h2>9. Governing law</h2>
<p>These terms are governed by the laws of England and Wales. Contact us at <a href="mailto:${esc(CONTACT)}">${esc(CONTACT)}</a>.</p>`;
  return page(base, "Terms of Service", body);
}
