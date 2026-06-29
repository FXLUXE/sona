# Sona — Your Complete Setup Guide

**The AI receptionist for your website — from zero to live, in plain English.**

*You don't need to be technical. Follow the steps in order. Anything in `monospace` is something you copy-paste or type.*

---

## 1. What Sona actually is

Sona is a small chat assistant that sits in the corner of your website. It reads **your own pages**, answers visitors' questions in your words — opening hours, services, prices, how to book — and when it isn't sure, it asks for the visitor's email or phone so you never lose the enquiry. It works at 2pm and at 2am.

**Why it matters:** most enquiries arrive when no one's free to answer. A missed message is a missed booking. Sona catches them all.

### How it works (the 30-second version)

1. You paste your website address.
2. Sona reads your pages and learns them.
3. You drop one line of code on your site (or just send people your demo link).
4. Visitors chat; Sona answers from your content and captures leads.
5. Leads land in your dashboard **and** ping your email/phone instantly.

> **It never makes things up.** If the answer isn't on your site, it says so and takes their details — it won't invent a price or a policy.

---

## 2. What you'll need (accounts)

| Service | What it's for | Cost | Required? |
|---|---|---|---|
| **Supabase** | Stores your data + sign-in | Free tier | Yes |
| **Google Gemini** | The AI brain + reading your pages | Free tier; pennies after | Yes |
| **A host (Railway)** | Puts Sona on the internet | ~$5/month | Yes, to go live |
| **A domain** | Your web address | ~£10/year | Recommended |
| **Stripe** | Taking subscription payments | Free; % per sale | Only to charge customers |
| **Resend** | Email lead alerts | Free tier | Optional |
| **Twilio** | Text-message lead alerts | Pay per text | Optional |

You can do everything except "go live" and "take payments" for **free** while you try it.

---

## 3. First-time setup

> A friendly developer (or your AI assistant) does this once. It's copy-paste, not coding.

1. **Get the keys.** Create a Supabase project and a Google AI Studio (Gemini) key.
2. **Fill in `.env`.** In the project there's a file called `.env.example`. Copy it to `.env` and paste your keys into the blanks (Supabase URL + keys, Gemini key). Each blank is labelled.
3. **Set up the database.** Run the included `schema.sql` and the migration file against your Supabase project (one click in Supabase's SQL editor).
4. **Start it.** `bun run dev` — Sona is now running on your computer at `http://localhost:4000`.

That's the whole technical bit. Everything below is point-and-click.

---

## 4. Using the dashboard

Open `/dashboard` and sign in with your email (a magic link arrives — no password).

- **First-run wizard:** paste your website → Sona claims a name for your bot, reads your site, and shows you a live preview. Done in a couple of minutes.
- **Preview tab:** see and test your bot exactly as visitors will.
- **Install tab:** copy your embed snippet (see §6); add more pages or *"Read my whole site"*.
- **Leads / Bookings / Conversations:** everything your bot captured (see §5).
- **Settings:** brand colour, logo, tone of voice, booking link, and where lead alerts go.
- **Billing:** your plan and usage (only matters once you charge customers).

---

## 5. Where your leads go (important!)

When a visitor leaves their details, the lead appears in **three** places — there is **no file on your computer** to hunt for:

1. **Dashboard → Leads tab** — newest first, with a hot/warm/cold rating and what they asked. Click **⬇ Download CSV** to open them in Excel or Google Sheets.
2. **Your email** (if you set a notify email in Settings) — instantly.
3. **Your phone by text** (if you connect Twilio) — instantly.

> **A note on files you might see:** files ending in `.ts`, `.js`, or `.sql` inside the project are **source code** — the recipe Sona is built from. They are not your leads and you never need to open them. Your leads are in the dashboard.

---

## 6. Putting Sona on your real website

In the dashboard **Install** tab, copy the one-line snippet. It looks like this:

```html
<script src="https://your-sona-domain.com/widget.js?tenant=your-bot-name"></script>
```

Paste it just before the `</body>` tag of your site (most site builders have a "custom code" or "footer code" box for exactly this). Save. The chat bubble now appears on your site, themed to your brand. That's it.

No website yet to edit? Just **send people your demo link** (`/demo/your-bot-name`) — it's a full working chat page on its own.

---

## 7. Getting customers (without cold-calling)

Sona comes with a built-in, low-touch acquisition engine. Two free channels:

### A. Search traffic (totally hands-off)
The pages at `/for/salons`, `/for/dental-practices`, `/for/trades`, etc. are built to rank on Google for "AI receptionist for [your trade]". Once you're live, they pull in visitors with zero effort from you. Slow to build, but free and automatic.

### B. Personalised-demo outreach (you press send)
This is the strong one. For each business you'd like as a customer, Sona builds them **their own** live demo and writes a short, honest email with the link — *"I built this for you, have a look."* The demo is the pitch.

```bash
# Find local businesses with websites (free, no account needed)
bun scripts/find-prospects.ts salons "Leeds"

# Build each a live demo + write the emails (review them first!)
bun scripts/generate-outreach.ts prospects-salons.json 5
```

This produces **`outreach.md`** (read every email before sending) and **`outreach.csv`** (for a mail tool). You then send them from **your own email account** — start with 20–40 a day. We never send for you; you stay in control.

> **The honest bit:** no tool can magically get customers for free with zero effort. You need the site live (a few pounds) and to actually send the emails (your inbox or a ~£30/month sender). Sona does everything *up to* the send.

---

## 8. What it costs

| Stage | Monthly | One-off |
|---|---|---|
| Trying it locally | £0 | £0 |
| Live, no paying customers yet | ~£5 (host) | ~£10 domain/yr |
| Sending outreach via your inbox | £0 | — |
| Sending outreach via a tool | ~£30 | — |
| Taking payments (Stripe) | £0 + ~2% per sale | — |

The AI itself costs roughly a fraction of a penny per conversation on the Gemini paid tier.

---

## 9. Troubleshooting

| You see… | What's happening | Do this |
|---|---|---|
| "Reading your site…" for a few seconds | It's reading the homepage; more pages load in the background | Normal — the bot answers within seconds and keeps improving |
| The demo gives weak answers | The site has little text to read (or is very image/JS-heavy) | Add more pages in the Install tab, or pick a content-richer site |
| A `.ts` / `.sql` file "is a mess" | That's source code, not your data | Ignore it — your leads are in the dashboard |
| Login email didn't arrive | Magic-link delivery | Check spam; confirm Supabase Auth is configured |
| Chat says "couldn't connect" | The AI provider had a brief spike | It retries automatically; try again in a moment |

---

## 10. Go-live checklist

- [ ] `.env` filled with Supabase + Gemini keys; database schema + migration run
- [ ] Deployed to a host (Railway) with a real `https://` domain
- [ ] `PUBLIC_BASE_URL` set to that exact domain
- [ ] Your domain added to Supabase Auth → redirect allow-list
- [ ] Logged in, added your site, tested the preview
- [ ] Embed snippet on your website (or sharing your demo link)
- [ ] Lead alert email/SMS set in Settings and tested
- [ ] *(To charge)* Stripe products + prices created, keys + webhook added
- [ ] *(Security)* Rotated any keys that were ever shared in chat/email
- [ ] *(Optional)* Email domain verified (SPF/DKIM) so alerts don't go to spam

---

*Sona — the front desk that never clocks out. Built to run itself, so you don't have to.*
