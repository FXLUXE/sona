# Sona — Launch Implementation Guide

| | |
|---|---|
| **Document** | Sona — Launch Implementation Guide |
| **For** | Daniel (founder) |
| **Version** | 1.1 |
| **Date** | 29 June 2026 (updated after full UAT) |
| **Status** | Ready to action — product passed a full two-niche customer UAT |
| **Product** | Sona — AI front-desk assistant for small UK businesses |
| **Live domain (planned)** | asksona.co.uk |
| **Launch tiers** | Starter £19 · Pro £39 · Business £79 (per month, 20% off annual) |

---

## How to read this guide

This is everything between "the product works on my laptop" and "a stranger can sign up and pay."
It is split in two:

- **Part A — Done for you (code).** What has already been built and committed. Nothing to do here; it's context.
- **Part B — Your jobs (founder).** The setup jobs only you can do, because they need accounts, payment details, or legal wording. Each is a numbered, plain-English walkthrough.

There is no jargon you need to act on. Where a step needs a technical value, it's given to you to copy.
Anything marked **[ask Claude]** is something I can do for you once you've supplied the account/keys.

> **Time to launch:** roughly **one focused day** if the domain and accounts go smoothly (a few of the
> steps have short waits — DNS and email verification — that run in the background).

---

## Table of contents

1. [Part A — What's already built](#part-a--whats-already-built)
2. [Part B — Your founder jobs](#part-b--your-founder-jobs)
   - [Job 1 — Register the domain](#job-1--register-the-domain-asksonacouk)
   - [Job 2 — Put it online (hosting)](#job-2--put-it-online-hosting)
   - [Job 3 — Set the environment values](#job-3--set-the-environment-values)
   - [Job 4 — Turn on payments (Stripe)](#job-4--turn-on-payments-stripe)
   - [Job 5 — Switch the AI to paid mode](#job-5--switch-the-ai-to-paid-mode)
   - [Job 6 — Brand the login email](#job-6--brand-the-login-email)
   - [Job 7 — Fill in the legal pages](#job-7--fill-in-the-legal-pages)
3. [The full settings list (reference)](#the-full-settings-list-reference)
4. [Final pre-launch checklist](#final-pre-launch-checklist)
5. [Launch day & the week after](#launch-day--the-week-after)

---

## Part A — What's already built

All of this is finished, tested, and saved to GitHub. No action needed — it's here so you know what's covered.

| Area | What it does |
|---|---|
| **Pricing in £** | Whole product shows £; tiers £19 / £39 / £79 with a clear comparison table |
| **Feature locks** | In-chat booking and a hidden "Powered by Sona" badge are Pro/Business only; Starter shows the badge (the upgrade nudge). Trials and demos get everything, to feel the value |
| **Booking calendar** | Proper month calendar; typing "book Friday at 2pm" jumps to the slot; name now required; late-night hours handled |
| **Demo window** | Clean centred preview (~60% of screen), matching fonts, fits on mobile, crisp logo |
| **Onboarding** | If a website can't be read, an honest "couldn't read your site" screen (retry / add by hand / continue) instead of a silent broken bot; optional business-name field |
| **Weekly recap + cleanup** | Owners automatically get a weekly "what your assistant did" email; old demos auto-delete. *(Runs only once the site is live — see Job 1 & 3.)* |
| **Branded emails** | Lead-alert email and the login email both styled to match the brand |
| **Speed** | All pages and the widget are compressed (~75% smaller) for fast loading on customers' sites |
| **Accessibility** | The chat is usable with screen readers and keyboard (Escape to close, labelled buttons, larger tap targets) |
| **Privacy tools** | "Export / delete a customer's data" controls in Settings (for GDPR requests) |
| **Tested demo becomes theirs** | When a prospect clicks "Get this on my site", the exact assistant they just tested copies straight into their new account — no rebuild, ready instantly |
| **Forgives typos** | Customers can mistype their website (`htps://`, `.cmo`, missing `https`) when building a demo, and visitors can misspell their questions — both are understood |
| **Reads hidden emails** | Sites that disguise their email to dodge spam bots are now decoded correctly (e.g. shows `info@vet.com`, not gibberish); fake placeholder emails like `info@mysite.com` are filtered out |
| **Polished demo** | Clean light typing bar, the "How I work" steps adapt to what's switched on (adds a booking step for paid plans), gentle left-to-right motion |
| **Works on any address** | The demo, preview and buttons always use the address the page is on, so nothing breaks if a setting points elsewhere |

> **Verified in a full UAT (29 Jun 2026):** a start-to-finish customer run across two niches (barber + vet) — read the whole site, built a demo, asked 5 questions including typo / prompt-injection / urgent-emergency stress tests, checked the feedback buttons, and confirmed the "Get this on my site" button lands a logged-out visitor on the sign-in screen. All passed; small issues found were fixed the same day.

---

## Part B — Your founder jobs

Do them roughly in this order. Jobs 1–3 get the site live; Job 4 makes it take money; Jobs 5–7 make it trustworthy.

---

### Job 1 — Register the domain (asksona.co.uk)

**Why:** every link Sona sends (login email, weekly recap, the embed code customers paste) needs a real
web address. Right now it points at your laptop.

| Step | Do this | Notes |
|---|---|---|
| 1 | Go to your domain registrar (GoDaddy was checked — **asksona.co.uk ≈ £12.99/yr**) | The `.com` is taken; `.co.uk` is the pick |
| 2 | Buy **asksona.co.uk** in your own name | Decline the upsells (privacy add-ons, hosting bundles, email) — not needed |
| 3 | Leave the tab open | You'll point it at the host in Job 2 |

> ⚠️ **Do this yourself** — I can't register domains or enter payment details. It takes ~5 minutes.

---

### Job 2 — Put it online (hosting)

**Why:** the app currently runs only on your machine. It needs a always-on home on the internet.
The project already includes a **Dockerfile** (a recipe that lets any modern host run it), so this is
mostly clicking through a host's setup.

**Recommended host: Render** — beginner-friendly, runs Docker out of the box. The **free** tier works to
start (it "sleeps" when idle and wakes on the first visit); **~£6/month** keeps it always-awake. (Railway
and Fly.io are alternatives.)

| Step | Do this |
|---|---|
| 1 | Create an account at **render.com** |
| 2 | Choose **"New → Web Service" → "Build and deploy from a Git repository" → Connect GitHub** |
| 3 | **Important — pick the right GitHub account.** GitHub asks which account to install Render on: choose **FXLUXE** (the repo lives there, *not* your personal account). Then choose **All repositories** (simplest) or **Only select repositories → sona**, and click Install. The `sona` repo now appears in Render |
| 4 | When it asks how to build, choose **Docker** (it finds the Dockerfile automatically) |
| 5 | **Region:** Render has **no UK option** — choose **Frankfurt (EU Central)**. Your customer data stays in the EU, which is right for UK GDPR |
| 6 | Set the **environment values** from [Job 3](#job-3--set-the-environment-values) before the first deploy |
| 7 | Deploy. You'll get a temporary address like `sona.onrender.com` — check it loads |
| 8 | In Render's **"Custom Domain"** settings, add **asksona.co.uk**; it shows you two DNS records |
| 9 | Back in your domain registrar (Job 1), paste those DNS records in. Wait 10–60 min for it to connect |

> **If the repo won't appear / "can't connect":** it's almost always that the Render app was installed on
> your **personal** GitHub instead of **FXLUXE**. The repo-access toggle ("Only select repositories") lives
> on **GitHub's** side, not Render's: **GitHub → Settings → Applications → Installed GitHub Apps → Render →
> Configure → Repository access**. Making the repo public does **not** fix this — keep it private; your
> secrets are meant to stay off GitHub.

> **[ask Claude]** Once you've created the host account and connected the repo, I can walk you through the
> exact screens and double-check the settings. I just can't create the account or hold the card.

---

### Job 3 — Set the environment values

**Why:** these are the secret keys and settings the app needs to talk to its database, AI, email, texts,
and payments. You paste them into the host's **"Environment"** tab (Job 2, step 4). They are **secrets** —
never put them on GitHub (the app is already set up to keep them off).

You already have most of these in your local `.env` file. The **new** ones for launch are the Stripe block
(Job 4) and `GEMINI_PAID` (Job 5). Here's the complete list:

| Setting | What it's for | Where it comes from |
|---|---|---|
| `PUBLIC_BASE_URL` | Your live web address | Set to `https://asksona.co.uk` |
| `SUPABASE_URL` | Database address | Supabase project settings |
| `SUPABASE_ANON_KEY` | Database public key | Supabase → API settings |
| `SUPABASE_SERVICE_KEY` | Database admin key (secret) | Supabase → API settings |
| `GEMINI_API_KEY` | The AI that answers | Google AI Studio |
| `ANTHROPIC_API_KEY` | Backup/premium AI | Anthropic console (optional if using Gemini paid) |
| `LLM_PROVIDER` | Which AI to use | Already set in your `.env` |
| `GEMINI_PAID` | **Privacy flag — see Job 5** | Set to `true` |
| `RESEND_API_KEY` | Sends emails | resend.com |
| `FROM_EMAIL` | The "from" address on emails | e.g. `hello@asksona.co.uk` |
| `ADMIN_EMAIL` | Where admin alerts go | Your email |
| `TWILIO_ACCOUNT_SID` | Sends SMS lead alerts | twilio.com |
| `TWILIO_AUTH_TOKEN` | Twilio secret | twilio.com |
| `TWILIO_FROM` | Your Twilio phone number | twilio.com |
| `STRIPE_SECRET_KEY` | **Takes payments — Job 4** | Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | Confirms payments — Job 4 | Stripe dashboard |
| `STRIPE_PRICE_STARTER` | Price ID, Starter monthly | Stripe (Job 4) |
| `STRIPE_PRICE_STARTER_ANNUAL` | Price ID, Starter yearly | Stripe (Job 4) |
| `STRIPE_PRICE_PRO` | Price ID, Pro monthly | Stripe (Job 4) |
| `STRIPE_PRICE_PRO_ANNUAL` | Price ID, Pro yearly | Stripe (Job 4) |
| `STRIPE_PRICE_BUSINESS` | Price ID, Business monthly | Stripe (Job 4) |
| `STRIPE_PRICE_BUSINESS_ANNUAL` | Price ID, Business yearly | Stripe (Job 4) |

> The app warns itself at start-up if `PUBLIC_BASE_URL` is missing or still set to localhost — so if you
> forget this one, you'll see a clear notice in the host's logs.

---

### Job 4 — Turn on payments (Stripe)

**Why:** right now there are **no payment keys at all**, so the product literally cannot charge anyone.
This is the single biggest "can't launch without it" item.

#### 4a. Create the account & products

| Step | Do this |
|---|---|
| 1 | Sign up at **stripe.com**, choose **United Kingdom**, currency **GBP (£)** |
| 2 | Complete business verification (name, bank account for payouts) — Stripe guides you |
| 3 | Go to **Products → Add product** and create **three products**: Starter, Pro, Business |
| 4 | For **each** product add **two prices**: a **monthly** price and a **yearly** price (yearly = 12 × monthly × 0.8, i.e. 20% off) |

**The numbers to enter:**

| Product | Monthly | Yearly (20% off) |
|---|---|---|
| Starter | £19.00 / month | £182.40 / year |
| Pro | £39.00 / month | £374.40 / year |
| Business | £79.00 / month | £758.40 / year |

#### 4b. Copy the keys & price IDs

Each price you create has an ID that looks like `price_1AbCd…`. Copy all six into the matching
`STRIPE_PRICE_*` settings from [Job 3](#job-3--set-the-environment-values).

| Step | Do this |
|---|---|
| 5 | Stripe → **Developers → API keys** → copy the **Secret key** → `STRIPE_SECRET_KEY` |
| 6 | Stripe → **Developers → Webhooks → Add endpoint**. URL = `https://asksona.co.uk/api/billing/webhook` (exactly this path). Select events for checkout & subscription updates |
| 7 | Copy the webhook's **Signing secret** → `STRIPE_WEBHOOK_SECRET` |
| 8 | Paste all six **price IDs** into the six `STRIPE_PRICE_*` settings |

#### 4c. Test it

| Step | Do this |
|---|---|
| 9 | Use Stripe **test mode** + a test card (`4242 4242 4242 4242`) to run one upgrade end-to-end |
| 10 | Confirm the account flips to the paid plan, then switch Stripe to **live mode** and swap in the live keys |

> **[ask Claude]** The code side is already wired for these exact key names. Once you've made the products
> and have the keys, I can help you test the full upgrade flow and confirm the webhook is landing.

---

### Job 5 — Switch the AI to paid mode

**Why:** on the free AI tier, customer chats **may be used to train the AI provider's models** — not
acceptable for a paid product handling business data. The app already warns about this at start-up.

| Option | Do this |
|---|---|
| **A (simplest)** | In Google AI Studio, enable **paid billing** on your Gemini key, then set `GEMINI_PAID=true` |
| **B (alternative)** | Provide an `ANTHROPIC_API_KEY` with billing, which the app uses for paid/regulated tenants |

Either one closes the "data may be used for training" warning. **Option A** matches your current setup.

> ⏱️ ~10 minutes in the Google AI Studio billing screen.

---

### Job 6 — Brand the login email

**Why:** the default sign-in email is a bare, suspicious-looking link — people won't click it. A ready-made,
on-brand email has been written for you.

**The template file:** `docs/email-templates/login-magic-link.html` (in this project). A preview of how it
reads:

> **Subject:** Your Sona login link
>
> ● **Sona**
> **Here's your login link**
> Tap the button below to sign in to your Sona dashboard. No password needed.
> **[ Log in to Sona → ]**
> *This link expires in 1 hour and can only be used once…*

| Step | Do this |
|---|---|
| 1 | **Allow your live address (required).** Supabase → **Authentication → URL Configuration** → set **Site URL** to `https://asksona.co.uk` and add `https://asksona.co.uk/**` under **Redirect URLs**. *Without this, login links bounce — this is exactly why signup failed in local testing* |
| 2 | In **Supabase → Authentication → Emails → "Magic Link"** |
| 3 | Set the **Subject** to `Your Sona login link` |
| 4 | Open `docs/email-templates/login-magic-link.html`, copy the whole file, paste it into the **Message (HTML)** box |
| 5 | Leave the `{{ .ConfirmationURL }}` part exactly as it is — Supabase fills in the real link |
| 6 | **Send from your own domain:** Supabase → **Project Settings → Auth → SMTP**. Turn on custom SMTP and enter your **Resend** details so it sends from `hello@asksona.co.uk`, not a Supabase address. *Without this, Supabase's built-in email is rate-limited to a handful per hour and may block test addresses — fine for you testing, not for real signups* |
| 7 | Send yourself a test login to check it looks right |

> **[ask Claude]** I wrote the email and can tweak the wording/colours any way you like — just say the word.
> The Supabase/Resend dashboard steps are yours because they need your account login.

---

### Job 7 — Fill in the legal pages

**Why:** the Terms and Privacy pages exist and cover the UK/GDPR basics, but a few details are marked
`[REVIEW]` and must be real before you sell.

| Placeholder | Replace with |
|---|---|
| Company / trading name | Your business name (and company number if registered) |
| Contact email | A real address, e.g. `privacy@asksona.co.uk` |
| Governing law / jurisdiction | e.g. "the laws of England and Wales" |

| Step | Do this |
|---|---|
| 1 | Decide your trading name, contact email, and jurisdiction |
| 2 | **[ask Claude]** Send me those three details and I'll drop them into the Terms & Privacy pages and commit |
| 3 | (Optional but wise) Have a solicitor skim the Terms before launch |

---

## The full settings list (reference)

A one-glance copy of every value to set in the host (Job 3). Tick them off as you go.

```
# App
PUBLIC_BASE_URL=https://asksona.co.uk
PORT=3000

# Database (Supabase)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# AI
GEMINI_API_KEY=
GEMINI_PAID=true
ANTHROPIC_API_KEY=        # optional
LLM_PROVIDER=

# Email (Resend)
RESEND_API_KEY=
FROM_EMAIL=hello@asksona.co.uk
ADMIN_EMAIL=

# SMS (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=

# Payments (Stripe)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_STARTER_ANNUAL=
STRIPE_PRICE_PRO=
STRIPE_PRICE_PRO_ANNUAL=
STRIPE_PRICE_BUSINESS=
STRIPE_PRICE_BUSINESS_ANNUAL=
```

---

## Final pre-launch checklist

| ✓ | Item | Job |
|---|---|---|
| ☐ | Domain asksona.co.uk registered | 1 |
| ☐ | App deployed to host, loads on the temporary address | 2 |
| ☐ | Custom domain connected (asksona.co.uk loads the app over https) | 2 |
| ☐ | All environment values set in the host | 3 |
| ☐ | Start-up logs show **no** config warnings | 3 |
| ☐ | Stripe products + 6 prices created, keys & webhook (`/api/billing/webhook`) set | 4 |
| ☐ | One successful **test** upgrade end-to-end, then switched to live | 4 |
| ☐ | `GEMINI_PAID=true` (or Anthropic key) — no "training" warning | 5 |
| ☐ | Supabase **Site URL + Redirect URLs** set to the live domain | 6 |
| ☐ | Login email branded + sending from your domain (Resend SMTP); test received | 6 |
| ☐ | Terms & Privacy placeholders filled | 7 |
| ☐ | Final walk-through: sign up → see demo → install code → upgrade | — |

---

## Launch day & the week after

| When | What happens |
|---|---|
| **On launch** | A new owner can enter their website, see a live demo built from it, paste one line of code to go live, and upgrade with a card — all self-serve, no calls |
| **Automatically** | Each owner gets a weekly "what your assistant did" recap; old demo sites clean themselves up |
| **First week** | Watch the host logs for errors; do a real upgrade with your own card to confirm money lands |
| **Next** | The post-launch backlog (referral program, the two extra pricing tiers, and the larger feature list) — each gets its own research pass before it's built |

---

*Prepared for Daniel · Sona launch · 29 June 2026. Items marked **[ask Claude]** are ready for me to pick up
as soon as you've done the account-side step.*
