# Sona — GTM & Marketing Research

| | |
|---|---|
| **Project** | Sona — multi-tenant RAG chat widget for SMB websites |
| **Document** | Go-To-Market & Marketing Deep Research |
| **Date** | 2026-06-24 |
| **Status** | 📊 Research — input to GTM decisions |
| **Author** | GTM research agent |

---

## Table of Contents

1. [Executive Summary & Recommendation](#1-executive-summary--recommendation)
2. [Competitor Landscape & Pricing](#2-competitor-landscape--pricing)
3. [Why SMBs Actually Buy Software](#3-why-smbs-actually-buy-software)
4. [Conversational Lead-Gen: Table-Stakes vs Differentiators](#4-conversational-lead-gen-table-stakes-vs-differentiators)
5. [Sales Motions That Work for Low-ACV SMB Tools](#5-sales-motions-that-work-for-low-acv-smb-tools)
6. [Vertical Playbooks & ROI Math](#6-vertical-playbooks--roi-math)
7. [Features to ADD — Prioritized](#7-features-to-add--prioritized)
8. [Messaging, Copy & Pricing](#8-messaging-copy--pricing)
9. [Sources](#9-sources)

---

## 1. Executive Summary & Recommendation

The founder's fear — *"why pay when ChatGPT is free?"* — is the wrong frame. Nobody
pays Sona for **answers**; ChatGPT gives those away. They pay for a **closed
revenue loop a chatbot can't reproduce by itself**: capture the visitor's
identity, qualify them, notify the owner in seconds, book the appointment, and
follow up if they ghost. ChatGPT can't see your website traffic, doesn't know
who the visitor is, and won't text your front desk. That gap is the product.

> **Recommended positioning:** Sona is not a chatbot — it is an **AI front-desk
> that turns website visitors into booked appointments, 24/7.** Sell the
> outcome (booked leads), not the technology (RAG).

The evidence is decisive on three points:

1. **The market has commoditized "chat trained on your site."** Chatbase, SiteGPT,
   Chatling, Tidio all ship it for $29–$150/mo. Pure Q&A is a race to zero.
   ([SiteGPT](https://sitegpt.ai/pricing), [Chatbase](https://www.chatbase.co/pricing))
2. **The money is in the workflow, and the workflow is verticalized.** AI
   receptionists (Smith.ai, Goodcall) charge $79–$300+/mo precisely because they
   *do something with the conversation* — book, route, notify.
   ([Smith.ai](https://smith.ai/pricing/ai-receptionist),
   [Goodcall via AnsweringAgent](https://answeringagent.com/blog/top-6-ai-receptionist-services-for-small-businesses))
3. **The ROI is absurd in Sona's favor.** One missed lead is worth $275–$1,200
   for trades, $3,000–$15,000 for legal, and ~$6,700 lifetime for a dental
   patient. A $99/mo tool that saves *one* lead a quarter is a 10–60× return.
   ([CallbirdAI](https://www.callbirdai.com/blog-contractors-lose-money-missed-calls),
   [Delmain](https://delmain.co/blog/average-lifetime-value-dental-patient/))

> **The #1 sales motion: build-the-demo-first ("I made you this") outreach into
> ONE vertical, expanding through web-designer/agency white-label as the scale
> channel.** Self-serve + paid ads will fail at this ACV — CAC has hit ~$1,200
> and SMB self-serve churns 3–7%/mo. ([Optifai](https://optif.ai/learn/questions/b2b-saas-churn-rate-benchmark/))

The five features that move Sona from "another chatbot" to "must-buy revenue
tool": **(1) calendar booking inside the chat, (2) instant SMS lead alerts to
the owner, (3) after-hours/missed-call capture framing, (4) a monthly
ROI/lead report, and (5) done-for-you setup + agency white-label.** Detail in §7.

---

## 2. Competitor Landscape & Pricing

The field splits into three camps. Sona is currently positioned in Camp A (the
commodity zone) but is *built* to win in Camp B.

**Camp A — "Chatbot trained on your site"** (commoditized, $29–$150/mo)
**Camp B — "AI receptionist / does the workflow"** (defensible, $79–$300+/mo)
**Camp C — "Support deflection for scale-ups"** (Intercom Fin; wrong buyer for Sona)

### 2.1 Comparison Table

| Product | Positioning | Entry → Top price | Charges for | Target | Lead-gen / booking | White-label / agency |
|---|---|---|---|---|---|---|
| **Chatbase** | AI agents on your data | $40 → $500/mo (+$199 WL) | Credits / messages | Startups, devs | Lead forms, actions | Add-on $199–$398/mo |
| **SiteGPT** | Chatbot trained on site | $39 → $259/mo | Messages (LLM incl.) | SMB, SaaS | Lead capture, handoff | Higher tiers |
| **Chatling** | No-code site chatbot | ~$21 → $99/mo | Messages | Solopreneurs, SMB | Lead collection | Limited |
| **Tidio (Lyro)** | Live chat + AI | $29 → $59+/mo (real $105–150) | Conversations/AI add-ons | E-comm, SMB | Lead bots, visitor tracking | No |
| **Intercom Fin** | AI support agent | $0.99 **per resolution** | Resolutions | Scale-ups, support teams | Support-first, not lead | Enterprise only |
| **Botpress** | Dev chatbot platform | Free → $750/mo | Conversations/seats | Developers, agencies | Build-your-own | Team tier |
| **CustomGPT** | RAG agent for content | ~$99 → $499/mo | Queries/pages | Mid-market, content | Forms | Reseller available |
| **Wix AI Chat** | Bundled site chat | Inside Wix plan | Site subscription | Wix DIY owners | Basic | No |
| **Shopify Sidekick** | Merchant copilot | Inside Shopify | Platform | Shopify merchants | Commerce-native | No |
| **Voiceflow** | Conversation design platform | Free → $625+/mo | Seats/usage | Builders, enterprise | Build-your-own | Enterprise |
| **ManyChat** | Social/DM marketing automation | Free → $15+/mo+ | Contacts | DTC, creators | Strong flows, no website RAG | Agency tier |
| **Smith.ai** | AI + human receptionist | $95/mo, plans to $1,275 | Per call | Local service SMB | **Books, routes, qualifies** | Reseller / partner |
| **Goodcall** | AI phone receptionist | $79 → $299/mo flat | Callers (flat) | Local service SMB | **Books, answers 24/7** | Partner program |

Sources: [Chatbase](https://www.chatbase.co/pricing) /
[CheckThat](https://checkthat.ai/brands/chatbase/pricing),
[SiteGPT](https://sitegpt.ai/pricing),
[Tidio](https://www.tidio.com/pricing/) / [CheckThat](https://checkthat.ai/brands/tidio/pricing),
[Fin AI](https://fin.ai/learn/best-ai-chatbots-customer-support),
[Botpress](https://botpress.com/pricing),
[CustomGPT](https://customgpt.ai/pricing/),
[Smith.ai](https://smith.ai/pricing/ai-receptionist),
[Goodcall](https://answeringagent.com/blog/top-6-ai-receptionist-services-for-small-businesses).

### 2.2 The Pricing Gaps Sona Can Exploit

> **Gap 1 — The "outcome at a flat SMB price" hole.** Chat tools (Camp A) are
> cheap but sell *answers*. Receptionists (Camp B) sell *outcomes* but at
> $79–$300+ and are **voice-only**. Nobody owns *text/website* outcome capture
> at a flat $49–$99. That is Sona's lane.

> **Gap 2 — Predictable pricing.** Chatbase's credits and Intercom's
> $0.99/resolution punish busy months. Goodcall's flat rate is explicitly
> marketed as the antidote. **Sona should be flat-rate per conversation tier** —
> a buyable, sleep-at-night number.

> **Gap 3 — White-label that isn't a $200–$400 tax.** Chatbase charges up to
> $398/mo to remove branding. Bundling **affordable white-label into an agency
> tier** undercuts the whole category for the reseller channel (§5).

---

## 3. Why SMBs Actually Buy Software

Local-service SMB owners are **not** AI-savvy buyers. They buy on **proof of
money and zero hassle**, not features. The data:

- **Self-serve + paid ads is a trap at this ACV.** Median B2B SaaS CAC has
  surged to ~$1,200; Google Ads CPCs are up 164% and LinkedIn up 89% since 2019.
  A $49–$99/mo product cannot absorb a $1,200 CAC.
  ([adv.me](https://adv.me/articles/conversion-optimization/saas-free-trial-conversion-rate-benchmarks-2025/))
- **SMB self-serve churns hard.** 3–7% monthly (≈31–58% annually) for
  self-serve SMB, far above enterprise.
  ([Optifai](https://optif.ai/learn/questions/b2b-saas-churn-rate-benchmark/))
- **Time-to-value decides retention.** 70% of churn happens in the first 90
  days; sub-7-day time-to-first-value cuts churn ~50%. For a non-technical owner,
  "first value" means *seeing a lead land in their inbox*, not pasting an embed.
  ([adv.me](https://adv.me/articles/conversion-optimization/saas-free-trial-conversion-rate-benchmarks-2025/))
- **Above ~$600/yr ACV, free trials beat freemium**; PLG works in the
  $1K–$10K ACV band at 18–30% trial→paid. Sona's $49–$99/mo ($600–$1,200/yr)
  sits right at that threshold.

> **Implication:** Self-serve stays as the *fulfillment* mechanic, but
> acquisition must be **done-for-you and outcome-proven**. The owner should buy a
> *result they've already seen working on their own site* — not sign up for a
> trial and figure it out. This is why the demo-first motion (§5) wins.

A modest **one-time setup fee ($99–$299) is a feature, not friction** for this
buyer: it signals "done for you," reduces tire-kickers, and funds the human
onboarding that drives the <7-day time-to-value that prevents churn.

---

## 4. Conversational Lead-Gen: Table-Stakes vs Differentiators

The conversion evidence is strong and consistent: chat that *acts* dramatically
outperforms chat that *answers*.

- Businesses using chatbots see **~3× higher conversion than website forms**;
  chatbots can lift leads ~50% and respond to 100% of visitors vs 30–40% for
  live chat alone.
  ([Botpress](https://botpress.com/blog/chatbot-marketing),
  [Tidio](https://www.tidio.com/blog/chatbot-pricing/))
- **Speed is everything:** respond within 5 minutes and you're **21× more likely
  to connect** than at 30 minutes — the entire case for instant SMS alerts.
  ([CallbirdAI](https://www.callbirdai.com/blog-contractors-lose-money-missed-calls))

| Capability | Status in 2026 | Sona today? | Verdict |
|---|---|---|---|
| RAG answers from site content | **Table-stakes** | ✅ | Necessary, not differentiating |
| Lead capture (name/email) | **Table-stakes** | ✅ | Necessary |
| Lead scoring | Nice-to-have | ✅ | Minor edge |
| Session memory | Nice-to-have | ✅ | Minor edge |
| Proactive prompts / openers | **Table-stakes** | ⚠️ verify | Must have |
| **Calendar booking in chat** | **Differentiator → table-stakes** | Backend only | **Surface it (§7)** |
| **Instant SMS alert to owner** | **Differentiator** | ❌ | **Highest-leverage add** |
| Email follow-up to lead | Differentiator | ⚠️ partial | Add |
| CRM / Sheets sync | Differentiator | ❌ | Add (agency-driven) |
| Multilingual | Differentiator | ⚠️ | Vertical-dependent |
| ROI / lead analytics report | **Differentiator (retention)** | ⚠️ | **Add — fights churn** |

> **The pattern:** every *answer* feature is commoditized; every *act-on-the-lead*
> feature (book, alert, follow-up, report) is still a differentiator. Sona should
> over-invest in the right-hand side of the conversation.

---

## 5. Sales Motions That Work for Low-ACV SMB Tools

Three motions, in priority order. The first is the wedge; the second is scale.

### 5.1 #1 — Build-the-Demo-First ("I made you this")

Pre-build a working Sona instance on the prospect's *own* website content, record
a 60–90s Loom of it answering a real question and booking a fake appointment, and
send it cold. This collapses the "imagine the value" gap into "watch it working
on your site." Video in cold email materially lifts replies, and AI-built audits
turn outreach from a pitch into a data-backed consultation.
([Weezly](https://weezly.com/blog/boost-cold-email-replies-with-loom-videos/),
[Get Map Leads](https://getmapleads.io/blog/cold-outreach-strategy-web-agencies))

Because Sona ingests a URL in minutes, the **marginal cost of a personalized demo
is near zero** — a structural advantage most SaaS can't match. This is the entire
answer to "why not just self-serve": you remove the work *and* prove the outcome
before asking for money.

### 5.2 #2 — Agency / Web-Designer White-Label (the scale channel)

Web designers and local marketing agencies already own the SMB relationship and
the website. Offering Sona as a **white-labeled, resold add-on** lets one agency
deploy across dozens of clients — turning Sona's thin moat into a *distribution*
advantage. Multi-channel outreach to agencies yields ~40% higher engagement and
31% lower cost-per-lead than direct.
([Sendr](https://www.sendr.ai/blog/10-ways-to-make-cold-outreach-more-engaging-(with-real-examples)))
Competitors gate white-label behind $199–$398/mo (Chatbase); a fair agency tier
is a wedge.

### 5.3 #3 — Vertical Land-and-Expand + Local Referral

Win 10 dental clinics, build vertical proof (testimonials, a "Sona for Dentists"
page, ROI numbers), then ride associations, Facebook groups, and word-of-mouth.
Local SMBs trust peer referral over ads. Pick **one** vertical first (recommend
**dental** or **trades** — see §6) to make the demo template and copy razor-sharp.

> **Do NOT lead with self-serve + paid ads.** At ~$1,200 CAC and 3–7% monthly
> churn, the unit economics don't close. Self-serve is the *delivery rail* behind
> a human/demo-led front door.

---

## 6. Vertical Playbooks & ROI Math

The ROI story is the sales pitch. One saved lead pays for a year of Sona.

| Vertical | Value of one customer/job | Cost of a missed lead | Where they hang out | Message that lands |
|---|---|---|---|---|
| **Dental / medical** | LTV ~$6,700 ($2k–5k typical); ~$500–800/yr/patient | New-patient lead costs $65–135 to acquire — wasting one is pure loss | Dental assoc. groups, FB practice-owner groups, dental SEO firms | "Never lose a new patient to an unanswered website at 9pm." |
| **Legal** | Case value $3k–$10k (PI $15k+) | PI leads cost $150–450; one missed = thousands gone | Bar assoc., legal-marketing agencies, Avvo/justia ecosystems | "Capture and book the next case while you're in court." |
| **Trades (HVAC/plumbing)** | Repair $150–300, install $1,500–3,000+; blended $400–800 | Each missed call = $275–$1,200; contractors lose **$45k–120k/yr** to missed calls | FB contractor groups, ServiceTitan/Jobber ecosystems, supply houses | "Booked jobs while you're on the truck. Stop bleeding $45k a year." |
| **Salons / local services** | Recurring client, moderate LTV | After-hours bookings lost to voicemail | Instagram, local FB, booking-software ecosystems | "Fill tomorrow's chairs from tonight's website visitors." |

Sources: [Delmain](https://delmain.co/blog/average-lifetime-value-dental-patient/),
[PatientGain](https://www.patientgain.com/lifetime-value-of-patients),
[Gabbyville](https://www.gabbyville.com/blog/cost-of-missed-calls-law-firms/),
[CallbirdAI](https://www.callbirdai.com/blog-contractors-lose-money-missed-calls),
[AxZ Lead](https://axzlead.com/blog/hvac-lead-generation-cost-sale-benchmarks),
[PULSE](https://pulseintel.dev/resources/cost-per-lead-benchmarks).

> **Recommended beachhead: Trades (HVAC/plumbing) or Dental.** Trades have the
> most visceral, quantified pain ($45k–120k/yr lost) and the clearest "you're
> losing money *right now*" hook. Dental has the highest LTV and the most
> organized buyer communities. Either makes the §5.1 demo razor-sharp; pick one
> and saturate it before adding a second.

---

## 7. Features to ADD — Prioritized

Each feature is tied to a buy-trigger or a competitor gap. Sona already has the
*backend* for booking — the win is **surfacing and packaging** the act-on-the-lead
layer.

| # | Feature | Why it sells (trigger / gap) | Effort | Priority |
|---|---|---|---|---|
| 1 | **Instant SMS alert to owner** on new lead | "Respond in 5 min = 21× connect." No Camp-A tool does this. The single biggest conversion lever. | Med (Twilio) | 🔴 P0 |
| 2 | **In-chat calendar booking** (surface existing backend; Cal.com/Calendly/Google) | Turns "lead" into "booked appointment" — the outcome buyers pay receptionists $79–300 for. Backend exists. | Med | 🔴 P0 |
| 3 | **After-hours / missed-lead framing + capture** | Directly monetizes the $45k–120k/yr missed-call pain; the headline message. Mostly positioning + 24/7 reliability. | Low | 🔴 P0 |
| 4 | **Monthly ROI / lead report** (leads, bookings, $ value, top questions) | Fights the 70%-in-90-days churn by *proving value monthly*. Justifies renewal. | Low–Med | 🟠 P1 |
| 5 | **Done-for-you setup + agency white-label tier** | Removes the buyer's work (§3) and unlocks the scale channel (§5.2). Undercuts Chatbase's $199–398 WL tax. | Med | 🟠 P1 |
| 6 | **Email follow-up to leads who ghost** | Closes the loop ChatGPT structurally cannot; lifts conversion. | Med | 🟡 P2 |
| 7 | **CRM / Google Sheets sync** | Agency requirement; data portability objection-killer. | Med | 🟡 P2 |
| 8 | **Proactive smart prompts** (page-aware openers) | Table-stakes for conversion; verify/strengthen. | Low | 🟡 P2 |

> **Build order:** SMS alert → surface booking → after-hours positioning →
> ROI report → white-label. The first three convert "chatbot" into "AI front
> desk." The last two convert "tool" into "channel + retained revenue."

---

## 8. Messaging, Copy & Pricing

### 8.1 Positioning Statement

> For local-service businesses that lose customers when no one answers the
> website, **Sona is the AI front-desk that answers every visitor, captures and
> books them, and texts you the lead instantly — 24/7.** Unlike ChatGPT or a
> plain chatbot, Sona doesn't just answer questions; it turns the conversation
> into a booked appointment in your calendar.

### 8.2 Tagline

> **Primary:** "Your website's front desk — booked, not missed."

Alternates:
- "Turn website visitors into booked appointments. 24/7."
- "Never lose another lead to an unanswered website."

### 8.3 Headlines

1. "Your website made $0 last night. Sona would have booked 3 appointments."
2. "Missed calls cost contractors $45,000 a year. Your website is leaking the same way."
3. "ChatGPT answers questions. Sona books customers."

### 8.4 Cold Outreach (demo-led)

> **Subject:** Made you something for [Business Name]
>
> Hi [Name] — I noticed [Business] gets website visitors after hours when no
> one's there to answer. So I built you a quick demo: I trained an AI front-desk
> on your own site — your services, hours, and pricing — and had it answer a real
> question and book an appointment.
>
> 60-second video here: [Loom link]
>
> It runs 24/7, texts you the moment someone wants to book, and adds them to your
> calendar. For [vertical], one captured [patient/job/case] more than covers it.
>
> Want me to turn it on for your site this week? — [You]

### 8.5 Pricing Recommendation

Flat-rate per conversation tier (predictable beats credits/per-resolution),
plus a one-time setup fee as a done-for-you signal. This aligns with the existing
`PLAN_LIMITS` while sharpening the outcome framing.

| Plan | Price | Setup | Conversations | Key outcome features |
|---|---|---:|---:|---|
| **Trial** | Free 14 days | — | 100 | See real leads land |
| **Starter** | $49/mo | $99 one-time | 500 | Answers + lead capture + **SMS alert** |
| **Pro** | $99/mo | $149 one-time | 3,000 | + **In-chat booking** + ROI report + remove branding |
| **Agency / White-label** | $299/mo | $299 one-time | 20,000 (multi-client) | + White-label + multi-seat + CRM sync |

> **Rationale:** Starter at **$49 (up from $29)** because the SMS alert + outcome
> framing justify it, and it stays *below* every voice receptionist (Goodcall
> $79+, Smith.ai $95+) while doing the website job they can't. Pro at **$99**
> bundles booking — the feature competitors charge receptionist prices for. The
> **setup fee is deliberate**: it funds human onboarding (drives <7-day
> time-to-value, halves churn) and screens tire-kickers. The Agency tier turns
> Sona's thin moat into distribution and undercuts Chatbase's $199–398 white-label
> tax.

---

## 9. Sources

- Chatbase pricing — https://www.chatbase.co/pricing
- Chatbase pricing breakdown (CheckThat) — https://checkthat.ai/brands/chatbase/pricing
- SiteGPT pricing — https://sitegpt.ai/pricing
- SiteGPT Chatbase review — https://sitegpt.ai/blog/chatbase-review
- Tidio pricing — https://www.tidio.com/pricing/
- Tidio pricing (CheckThat) — https://checkthat.ai/brands/tidio/pricing
- AI chatbot software cost comparison (Tidio) — https://www.tidio.com/blog/chatbot-pricing/
- Best AI chatbot builders for small business (Builts AI) — https://builts.ai/blog/best-ai-chatbot-builders-small-business/
- Intercom Fin / best AI chatbots — https://fin.ai/learn/best-ai-chatbots-customer-support
- Botpress pricing — https://botpress.com/pricing
- CustomGPT pricing — https://customgpt.ai/pricing/
- Smith.ai AI receptionist pricing — https://smith.ai/pricing/ai-receptionist
- Top 6 AI receptionist services (AnsweringAgent) — https://answeringagent.com/blog/top-6-ai-receptionist-services-for-small-businesses
- AI receptionist pricing 2026 (AgentZap) — https://agentzap.ai/blog/ai-receptionist-pricing-complete-cost-guide-2025
- B2B SaaS churn benchmarks (Optifai) — https://optif.ai/learn/questions/b2b-saas-churn-rate-benchmark/
- SaaS free-trial conversion benchmarks 2025 (adv.me) — https://adv.me/articles/conversion-optimization/saas-free-trial-conversion-rate-benchmarks-2025/
- Freemium vs trial (SaaSFactor) — https://www.saasfactor.co/blogs/freemium-vs-trial-models-in-saas-what-really-boosts-conversions
- Cold outreach for web agencies (Get Map Leads) — https://getmapleads.io/blog/cold-outreach-strategy-web-agencies
- Video in cold email (Weezly) — https://weezly.com/blog/boost-cold-email-replies-with-loom-videos/
- Engaging cold outreach examples (Sendr) — https://www.sendr.ai/blog/10-ways-to-make-cold-outreach-more-engaging-(with-real-examples)
- Chatbot marketing strategies (Botpress) — https://botpress.com/blog/chatbot-marketing
- Conversational marketing chatbots (MasterOfCode) — https://masterofcode.com/blog/conversational-marketing
- Dental patient lifetime value (Delmain) — https://delmain.co/blog/average-lifetime-value-dental-patient/
- Lifetime value of patients (PatientGain) — https://www.patientgain.com/lifetime-value-of-patients
- Missed calls cost for law firms (Gabbyville) — https://www.gabbyville.com/blog/cost-of-missed-calls-law-firms/
- Contractors lose to missed calls (CallbirdAI) — https://www.callbirdai.com/blog-contractors-lose-money-missed-calls
- HVAC lead cost & sales benchmarks (AxZ Lead) — https://axzlead.com/blog/hvac-lead-generation-cost-sale-benchmarks
- Cost per lead by vertical (PULSE) — https://pulseintel.dev/resources/cost-per-lead-benchmarks
- Missed business calls statistics (Aira) — https://www.getaira.io/blog/missed-business-calls-statistics
