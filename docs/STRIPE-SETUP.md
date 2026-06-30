# Stripe Setup — Sona

| | |
|---|---|
| **Goal** | Take real subscription payments (£19 / £39 / £79 a month) |
| **Time** | ~30–40 min total (test) + ~15 min to flip live later |
| **Cost** | Free to set up. Stripe only charges a % when a real customer pays |
| **Webhook URL** | `https://asksona.co.uk/api/billing/webhook` |

> **Golden rule:** Stripe has **two separate worlds** — **Test mode** and **Live mode**. Keys, products, and webhooks created in one do **not** exist in the other. You'll build it in Test first, then repeat the same steps in Live.

---

## In plain English (for you)

1. Finish the Stripe onboarding screens (you're doing this now) — just account info.
2. Create your 3 plans (Starter/Pro/Business) as products in Stripe.
3. Copy a handful of codes from Stripe into your app's settings (Render).
4. Tell Stripe where to send payment notifications (the webhook).
5. Test it with a fake card.
6. When happy, switch Stripe to **Live** and repeat the copy-codes step with the live versions.

---

## Step 1 — Finish onboarding (now, Test mode)

Keep clicking through the screens (you already chose **Stripe does it** / Managed Payments, and **Recurring + Invoicing**). These just configure the account. Nothing takes money yet.

## Step 2 — Create your 3 plans

In Stripe: **Product catalogue → + Add product**. Make three:

| Product name | Price | Billing |
|---|---|---|
| Sona Starter | £19 | Monthly, recurring |
| Sona Pro | £39 | Monthly, recurring |
| Sona Business | £79 | Monthly, recurring |

(Optional: add a yearly price to each later for the annual plans.)

After saving each, click it and copy its **Price ID** — it looks like `price_1AbcDe...`. You need all three.

## Step 3 — Put the codes into Render

Go to Render → your Sona service → **Environment**. Add/confirm these:

| Setting | Where to get it in Stripe |
|---|---|
| `STRIPE_SECRET_KEY` | Developers → API keys → **Secret key** (`sk_test_...` for now) |
| `STRIPE_PRICE_STARTER` | Price ID of Sona Starter |
| `STRIPE_PRICE_PRO` | Price ID of Sona Pro |
| `STRIPE_PRICE_BUSINESS` | Price ID of Sona Business |

(Annual ones — `STRIPE_PRICE_STARTER_ANNUAL` etc. — only if you made yearly prices.)

> ⚠️ You paste the secret key yourself — I never handle keys.

## Step 4 — Set up the webhook

This is how Stripe tells your app "a customer just paid / cancelled" so the plan updates automatically.

In Stripe: **Developers → Webhooks → + Add endpoint**.
- **Endpoint URL:** `https://asksona.co.uk/api/billing/webhook`
- **Events to send:** add at least
  - `checkout.session.completed`
  - `customer.subscription.deleted`
  - `customer.subscription.updated`
- Save, then on the endpoint page copy the **Signing secret** (`whsec_...`).
- Put it in Render as `STRIPE_WEBHOOK_SECRET`.

Save in Render (it redeploys).

## Step 5 — Test it (still Test mode)

1. On your site, go to upgrade/checkout.
2. Use Stripe's **test card:** `4242 4242 4242 4242`, any future expiry, any CVC, any postcode.
3. Complete checkout → your dashboard plan should update to the paid tier.
4. Check the webhook shows a green ✓ in Stripe (Developers → Webhooks → your endpoint → recent deliveries).

If the plan updates and the webhook is green — it works.

---

## Step 6 — Go LIVE (when you're ready for real money)

This is the part people miss. **Repeat Steps 2–4 in Live mode:**

1. Toggle Stripe from **Test mode → Live mode** (top-left switch).
2. Re-create the 3 products/prices (Live has its own) → copy the **new live Price IDs**.
3. Developers → API keys → copy the **live Secret key** (`sk_live_...`).
4. Developers → Webhooks → add the same endpoint URL again in Live → copy the **live signing secret**.
5. In Render, **replace** the test values with the live ones:
   - `STRIPE_SECRET_KEY` → `sk_live_...`
   - `STRIPE_PRICE_*` → the live Price IDs
   - `STRIPE_WEBHOOK_SECRET` → the live `whsec_...`
6. Before flipping live, Stripe will ask you to **activate the account** (business details + a bank account for payouts). Do that.

Do one real £19 purchase on yourself to confirm, then you're taking money.

---

## Quick checklist

- [ ] Onboarding finished (Test)
- [ ] 3 products created, Price IDs copied
- [ ] `STRIPE_SECRET_KEY` in Render
- [ ] 3 `STRIPE_PRICE_*` in Render
- [ ] Webhook endpoint added → `STRIPE_WEBHOOK_SECRET` in Render
- [ ] Test card checkout works + webhook green
- [ ] **Later:** repeat all in Live mode + activate account + swap to `sk_live_` / live prices / live `whsec_`
