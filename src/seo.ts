// seo.ts — programmatic, autonomous inbound: one genuinely-differentiated landing page per
// vertical ("AI receptionist for dental practices", etc.), served at /for/<slug>, plus a
// sitemap. These rank for "[vertical] + missed calls / after-hours booking / receptionist"
// long-tail searches and funnel into the same self-serve demo. No accounts, no sending, no
// spam — it ships with the app and works with zero founder involvement.
//
// Each vertical has hand-written copy (pain + example Q&A) so pages carry real, distinct
// value — NOT mad-lib doorway pages, which Google penalises.

function esc(s: any): string {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

type QA = { q: string; a: string };
type Vertical = {
  slug: string;
  name: string; // plural, lowercase, for headlines ("salons")
  title: string; // <title>
  desc: string; // meta description
  headline: string;
  pain: string;
  examples: QA[];
  placeholder: string;
};

export const VERTICALS: Vertical[] = [
  {
    slug: "salons",
    name: "salons",
    title: "AI receptionist for salons — book more, miss fewer",
    desc: "Sona answers your salon's website visitors 24/7 from your own pages — hours, services, prices — and captures bookings while you're with a client. No calls, set up in minutes.",
    headline: "Your chair is full. Your front desk shouldn't be the bottleneck.",
    pain: "You're mid-colour when the phone rings, so it goes to voicemail — and that client just books the salon down the road instead. Sona answers every website visitor instantly, day or night, with your real hours, services, and prices, and takes their details so you can call back between appointments.",
    examples: [
      { q: "Do you have any openings for a cut and colour this Saturday?", a: "Sona checks the hours and services on your site, explains how you book, and takes the visitor's name and number so you can confirm — even at 11pm." },
      { q: "How much is a full set of highlights?", a: "It quotes straight from your own price list. If a service isn't listed, it says so and offers to have you follow up — it never guesses a price." },
      { q: "Do you do bridal hair and makeup?", a: "It answers from your services pages and, for anything bespoke, collects the enquiry so you can reply with a quote." },
    ],
    placeholder: "https://your-salon.com",
  },
  {
    slug: "dental-practices",
    name: "dental practices",
    title: "AI receptionist for dental practices — capture every enquiry",
    desc: "Sona answers your dental practice's website visitors around the clock from your own pages — treatments, insurance, hours — and captures new-patient enquiries 24/7. Self-serve, no calls.",
    headline: "New patients decide at 9pm. Your reception closed at 5.",
    pain: "Most new-patient enquiries arrive after hours, when no one's at the desk. Sona reads your treatment and fees pages and answers instantly — then captures the enquiry so your team starts Monday with a full follow-up list instead of missed calls.",
    examples: [
      { q: "Do you take my insurance / are you taking new NHS patients?", a: "Sona answers from what your site states about plans and availability. Where it's unsure, it asks for contact details rather than guessing — important for anything clinical." },
      { q: "How much is a check-up and hygiene appointment?", a: "It quotes from your published fees. No price on the page? It says so and collects the enquiry for your team." },
      { q: "Do you offer emergency appointments today?", a: "It explains your stated emergency policy and takes the patient's details so you can triage and call back fast." },
    ],
    placeholder: "https://your-practice.com",
  },
  {
    slug: "trades",
    name: "trades",
    title: "AI receptionist for tradespeople — never miss a job lead",
    desc: "On the tools all day? Sona answers your website visitors from your own pages — services, areas covered, call-out info — and captures job leads 24/7 so you stop losing work to voicemail.",
    headline: "You can't answer the phone with both hands in a boiler.",
    pain: "Every missed call is a job that goes to whoever picks up first. Sona answers your site's visitors instantly — what you do, where you cover, how call-outs work — and writes down the lead with their number, so you ring back from the van instead of losing it.",
    examples: [
      { q: "Do you cover my area and can you quote for a boiler service?", a: "Sona answers coverage from your site and, for the quote, takes the job details + the customer's number so you can price it and call back." },
      { q: "Are you available for emergency call-outs tonight?", a: "It states your call-out policy from your pages and captures the urgent lead immediately so you see it fast." },
      { q: "How much do you charge per hour?", a: "It quotes only if your rates are published; otherwise it asks for the job details and your contact so you can give a real number." },
    ],
    placeholder: "https://your-trade-site.com",
  },
  {
    slug: "clinics",
    name: "clinics",
    title: "AI receptionist for clinics — answer 24/7, capture every lead",
    desc: "Sona answers your clinic's website visitors any hour from your own pages — treatments, pricing, hours — and captures new enquiries while your team is with patients. Self-serve, no calls.",
    headline: "Your team is with patients. Your website is taking the calls.",
    pain: "Visitors researching treatments want answers now — and bounce if no one responds. Sona answers from your own treatment and pricing pages instantly, and collects the enquiry so your front desk follows up with warm leads instead of chasing.",
    examples: [
      { q: "What does this treatment involve and what does it cost?", a: "Sona answers from your treatment pages and published pricing. For anything it can't confirm, it asks for contact details rather than inventing specifics." },
      { q: "Do I need a referral, or can I book directly?", a: "It explains your stated booking process and captures the enquiry so your team can follow up." },
      { q: "What are your opening hours and where are you?", a: "Straight from your site — instantly, at any hour." },
    ],
    placeholder: "https://your-clinic.com",
  },
  {
    slug: "fitness-studios",
    name: "fitness studios",
    title: "AI receptionist for gyms & studios — turn visitors into members",
    desc: "Sona answers your gym or studio's website visitors 24/7 from your own pages — classes, memberships, trials — and captures sign-up leads while you're on the floor. No calls, self-serve.",
    headline: "People join at midnight, scrolling on the sofa. Be there.",
    pain: "Memberships get decided after a workout or late at night — long after your front desk has gone home. Sona answers class schedules, membership options, and trial offers from your own site instantly, and captures the lead so you convert the impulse instead of losing it.",
    examples: [
      { q: "Do you offer a free trial or class pass?", a: "Sona answers from your memberships page and takes the visitor's details to start the trial — while they're still motivated." },
      { q: "What's the timetable for beginner classes?", a: "It reads your schedule pages and answers; for anything not listed, it collects the enquiry." },
      { q: "How much is monthly membership?", a: "Quoted from your published prices. No guessing if it isn't on the page." },
    ],
    placeholder: "https://your-studio.com",
  },
  {
    slug: "auto-shops",
    name: "auto shops",
    title: "AI receptionist for garages & auto shops — book more work",
    desc: "Sona answers your garage's website visitors from your own pages — services, MOT, hours — and captures booking enquiries 24/7 so you stop losing work to missed calls. Self-serve, no calls.",
    headline: "Hands greasy, phone ringing, customer waiting. Sona gets the call.",
    pain: "You can't stop a job to answer every enquiry — so they ring the next garage. Sona answers what you do, your hours, and how booking works from your own site, and writes down the job lead so you ring back when you're clear.",
    examples: [
      { q: "Can I book an MOT and service for next week?", a: "Sona explains your booking process from your site and takes the vehicle + contact details so you can slot it in and confirm." },
      { q: "Do you do diagnostics for a warning light?", a: "It answers from your services pages and captures the job so you can advise and book it in." },
      { q: "How much is a standard service?", a: "Quoted from your published prices, or it collects the enquiry if the price isn't listed." },
    ],
    placeholder: "https://your-garage.com",
  },
];

export const verticalSlugs = VERTICALS.map((v) => v.slug);
export const getVertical = (slug: string) => VERTICALS.find((v) => v.slug === slug);

export function seoPageHtml(base: string, v: Vertical): string {
  const B = JSON.stringify(base);
  const canonical = `${esc(base)}/for/${esc(v.slug)}`;
  // FAQ structured data (JSON-LD) — eligible for rich results, strengthens the long-tail rank.
  const faqLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: v.examples.map((e) => ({
      "@type": "Question",
      name: e.q,
      acceptedAnswer: { "@type": "Answer", text: e.a },
    })),
  });
  const examples = v.examples
    .map(
      (e) =>
        `<div class="qa"><p class="q">${esc(e.q)}</p><p class="a">${esc(e.a)}</p></div>`
    )
    .join("");
  const others = VERTICALS.filter((x) => x.slug !== v.slug)
    .map((x) => `<a href="${esc(base)}/for/${esc(x.slug)}">${esc(x.name)}</a>`)
    .join("");
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(v.title)}</title>
<meta name="description" content="${esc(v.desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${esc(v.title)}">
<meta property="og:description" content="${esc(v.desc)}">
<meta property="og:image" content="${esc(base)}/og-image.svg">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<script type="application/ld+json">${faqLd}</script>
<style>
  :root{--ink:#11212b;--brass:#c79a4b;--brass-deep:#a87f33;--paper:#f6f1e9;--white:#fff;--sage:#3a5a50;--muted:#5b6670;--line:#e4dccb;--display:"Fraunces",Georgia,serif;--body:"Inter",system-ui,sans-serif}
  *{box-sizing:border-box}
  body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--body);line-height:1.6;background-image:radial-gradient(120% 80% at 50% -8%,rgba(199,154,75,.10),transparent 60%)}
  .wrap{max-width:920px;margin:0 auto;padding:0 22px}
  header{display:flex;align-items:center;justify-content:space-between;padding:22px 0}
  .logo{display:flex;align-items:center;gap:9px;font-family:var(--display);font-weight:600;font-size:21px}
  .logo .b{color:var(--brass)}
  .nav a{color:var(--ink);text-decoration:none;font-weight:600;font-size:14.5px;margin-left:18px}
  .btn{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:11px;padding:13px 20px;font-weight:600;font-size:15px;cursor:pointer;text-decoration:none}
  .btn-brass{background:linear-gradient(180deg,var(--brass),var(--brass-deep));color:#231706}
  .btn-brass:focus-visible{outline:3px solid var(--brass);outline-offset:3px}
  .eyebrow{font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--brass-deep);font-weight:600}
  h1{font-family:var(--display);font-weight:500;font-size:clamp(32px,5.2vw,52px);line-height:1.05;letter-spacing:-.02em;margin:14px 0 0;text-wrap:balance}
  .lede{font-size:clamp(17px,2vw,19px);color:#36424a;max-width:60ch;margin:18px 0 0}
  .demo{background:var(--white);border:1px solid var(--line);border-radius:16px;padding:20px;margin:26px 0 0;max-width:560px;box-shadow:0 18px 44px -28px rgba(17,33,43,.4)}
  .demo .row{display:flex;gap:10px;flex-wrap:wrap}
  .demo input{flex:1;min-width:200px;border:1px solid var(--line);border-radius:10px;padding:12px 14px;font-size:16px;outline:0}
  .demo input:focus{border-color:var(--brass)}
  #st{margin-top:10px;font-size:14px;color:var(--muted);min-height:18px}
  #res{margin-top:14px;display:none}#res iframe{width:100%;height:420px;border:1px solid var(--line);border-radius:12px}
  section{padding:42px 0}
  h2{font-family:var(--display);font-weight:500;font-size:clamp(24px,3.4vw,32px);letter-spacing:-.02em;margin:0 0 6px}
  .qa{border-top:1px solid var(--line);padding:18px 0}
  .qa .q{font-weight:600;margin:0;font-size:17px}
  .qa .a{margin:8px 0 0;color:#42505a}
  .others{border-top:1px solid var(--line);padding:26px 0 60px;color:var(--muted);font-size:14.5px}
  .others a{color:var(--brass-deep);text-decoration:none;font-weight:600;margin-right:14px;white-space:nowrap;display:inline-block}
  footer{border-top:1px solid var(--line);padding:24px 0;color:var(--muted);font-size:13px;display:flex;gap:16px;flex-wrap:wrap;justify-content:space-between}
  footer a{color:var(--muted)}
  @media (prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
</style></head>
<body>
<div class="wrap">
  <header>
    <a class="logo" href="${esc(base)}/" style="text-decoration:none;color:inherit">Sona<span class="b">.</span></a>
    <nav class="nav"><a href="${esc(base)}/#pricing">Pricing</a><a href="${esc(base)}/dashboard">Sign in</a></nav>
  </header>

  <section style="padding-top:24px">
    <span class="eyebrow">AI receptionist for ${esc(v.name)}</span>
    <h1>${esc(v.headline)}</h1>
    <p class="lede">${esc(v.pain)}</p>
    <div class="demo">
      <div class="row">
        <input id="u" type="url" inputmode="url" placeholder="${esc(v.placeholder)}" aria-label="Your website address">
        <button class="btn btn-brass" id="go">See it on my site</button>
      </div>
      <div id="st"></div>
      <div id="res"><iframe id="fr" title="Your live Sona demo"></iframe></div>
    </div>
  </section>

  <section>
    <span class="eyebrow">In your words</span>
    <h2>What ${esc(v.name)} actually get asked</h2>
    <p style="color:#42505a;max-width:60ch;margin:6px 0 8px">Sona answers only from your own pages — and when it can't, it asks for a contact instead of guessing.</p>
    ${examples}
  </section>

  <section style="padding-top:0">
    <a class="btn btn-brass" href="${esc(base)}/dashboard">Start free — no card</a>
    <span style="margin-left:14px;color:var(--muted);font-size:14px">14-day trial · set up in minutes · cancel anytime</span>
  </section>

  <div class="others">Also for: ${others}</div>
</div>
<footer><div class="wrap" style="display:flex;gap:16px;flex-wrap:wrap;justify-content:space-between;width:100%;padding:0">
  <span>Sona — an AI receptionist for local-service businesses.</span>
  <span><a href="${esc(base)}/privacy">Privacy</a> · <a href="${esc(base)}/terms">Terms</a></span>
</div></footer>
<script>
(function(){var B=${B};var u=document.getElementById('u'),go=document.getElementById('go'),st=document.getElementById('st'),res=document.getElementById('res'),fr=document.getElementById('fr');
function run(){var v=(u.value||'').trim();if(!/^https?:\\/\\//i.test(v)){if(v){v='https://'+v;u.value=v}else{st.textContent='Enter your website address.';return}}
go.disabled=true;res.style.display='none';st.textContent='Reading your site and waking your receptionist…';
fetch(B+'/api/demo',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:v})}).then(function(r){return r.json().then(function(j){return{ok:r.ok,j:j}})}).then(function(x){go.disabled=false;if(!x.ok){st.textContent=(x.j&&x.j.error)||'Could not build a demo for that link.';return}st.textContent='Done — ask your receptionist anything below.';fr.src=x.j.demoUrl;res.style.display='block';res.scrollIntoView({block:'center'})}).catch(function(){go.disabled=false;st.textContent='Network error — please try again.'})}
go.addEventListener('click',run);u.addEventListener('keydown',function(e){if(e.key==='Enter')run()});
})();
</script>
</body></html>`;
}

export function sitemapXml(base: string): string {
  const urls = [`${base}/`, `${base}/privacy`, `${base}/terms`, ...VERTICALS.map((v) => `${base}/for/${v.slug}`)];
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join("\n") +
    `\n</urlset>`
  );
}
