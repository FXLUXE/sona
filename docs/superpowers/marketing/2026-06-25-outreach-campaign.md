# Sona — Demo-Led Outreach Campaign

| | |
|---|---|
| **Product** | Sona — AI receptionist for local-service SMBs |
| **Play** | Personalized live-demo cold outreach (the demo is the pitch) |
| **Date** | 2026-06-25 |
| **Status** | Built — review before paying for anything |
| **Founder effort** | One-time deploy + send from your own inbox. No calls. |

---

## The idea

Generic "try my SaaS" email gets ignored. Instead, for each prospect we build a **live Sona receptionist already trained on their own website**, and the email is just: *"I built this for you — have a look."* It's about them, and it already works. That's the one angle that earns a click.

---

## The pipeline (all built, all free to run)

| Step | Tool | Cost | Who |
|---|---|---|---|
| 1. Find prospects | `scripts/find-prospects.ts` (OpenStreetMap, no key) | Free | AI |
| 2. Build a live demo each + write the emails | `scripts/generate-outreach.ts` | Free* | AI |
| 3. Review the output | `outreach.md` | Free | You |
| 4. Send | Your email / a sender like Instantly | **You pay here** | You |

\* Each demo runs a crawl + embeddings on your Gemini key (fractions of a penny each); bounded by a `limit` and the global demo budget.

### How to run

```bash
# 1. Find salons in Leeds that have a website (writes prospects-salons.json)
bun scripts/find-prospects.ts salons "Leeds"

# 2. Build demos + emails for the first 5 (writes outreach.md + outreach.csv)
bun scripts/generate-outreach.ts prospects-salons.json 5
```

`outreach.md` = human-readable, every email + demo link to review.
`outreach.csv` = `to, business, website, demoUrl, subject` for mail-merge.

---

## What you must do before sending (the only paid/manual parts)

1. **Deploy + domain** (~£5/mo host + ~£10/yr domain). Demo links must be a real `https://` domain, not localhost — set `PUBLIC_BASE_URL` to it.
2. **A sending route.** Your own inbox (slow, free, warmest) or a cold-email tool (Instantly/Smartlead, ~£30/mo) with a **separate domain** + SPF/DKIM so your main domain's reputation is safe.
3. **Find email addresses.** OSM rarely lists them; use the site's contact page or an email-finder. Many founders just send via the site contact form / LinkedIn instead.

---

## Legal & deliverability reality (UK)

- **B2B only.** Under PECR, unsolicited B2B email to businesses is permitted **with** the sender identified and a working opt-out — both are built into the copy ("Reply stop"). Be cautious with sole-trader/personal addresses (treated more like consumers).
- **Volume kills deliverability.** Send small daily batches (20–40) from a warmed domain, not a blast. Personalization (the demo link) is what keeps you out of spam.
- We do **not** send unattended. You stay in control of who's contacted and when.

---

## Suggested cadence

| Day | Action |
|---|---|
| 0 | Email 1 (subject A) + their demo link |
| 3 | Follow-up (lighter) if no reply |
| — | Stop after 2 touches. Reply "stop" → removed. |

Start with **one vertical, one city** (e.g. Leeds salons), 20–40/day. Measure demo clicks → signups. Scale the winner.

---

## Parallel free channel (already shipped, zero send)

The `/for/<vertical>` SEO pages + sitemap are live in the app. Once deployed they earn inbound search traffic for "AI receptionist for [vertical]" with no outreach at all — slower, but $0 and fully hands-off.

---

## Review checklist

- [ ] Read `outreach.md` — does the copy sound like you? (Edit `src/outreach.ts` to adjust.)
- [ ] Click a generated demo link — does it represent that business well?
- [ ] Decide send channel (own inbox vs tool) and whether to pay for it.
- [ ] Confirm sender name/email in `src/outreach.ts` (currently `Daniel / daniel@sona.app`).
