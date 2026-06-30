// billing.ts — Stripe: checkout, customer portal, webhook handling, plan limits.
// Framework-agnostic (mirrors lib.ts). Money lives here; the rest of the app stays
// payment-unaware and just reads tenant.plan / planLimits().
import Stripe from "stripe";
import { cfg, getTenant, sb, PLAN_LIMITS } from "./lib";

// Lazily constructed singleton so the module imports cleanly even when billing is
// unconfigured (the server must boot without Stripe keys — billing just stays disabled).
// One instance is created on first use and reused for every subsequent call.
let _stripe: Stripe | null = null;
const stripe = (): Stripe => {
  if (!_stripe) _stripe = new Stripe(cfg.stripeSecret);
  return _stripe;
};

// Resolve a tenant's effective limits. A tenant row MAY override either limit with an
// explicit column; otherwise fall back to its plan's defaults, then to trial. Mirrors
// the resolution overQuota() uses for the conversation cap.
export function planLimits(t: any): { conversations: number; sources: number } {
  const plan = PLAN_LIMITS[t?.plan ?? "trial"] ?? PLAN_LIMITS.trial;
  return {
    conversations: t?.monthly_conversation_limit ?? plan.conversations,
    sources: t?.source_limit ?? plan.sources,
  };
}

// Start a Stripe Checkout session for `plan`. Returns the hosted-checkout URL.
export async function createCheckout(tenant: string, plan: string): Promise<{ url: string }> {
  if (!cfg.stripeSecret) throw new Error("billing disabled");
  // `plan` may be a base tier ("pro") or an annual variant ("pro_annual"); the price differs
  // but the stored plan must be the BASE tier so PLAN_LIMITS/overQuota still resolve limits.
  const price = cfg.stripePrices[plan];
  if (!price) throw new Error("unknown plan");
  const basePlan = plan.replace(/_annual$/, "");
  const t = await getTenant(tenant);
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    customer: t?.stripe_customer_id || undefined,
    client_reference_id: tenant,
    metadata: { tenant, plan: basePlan },
    success_url: `${cfg.baseUrl}/dashboard?billing=success`,
    cancel_url: `${cfg.baseUrl}/dashboard?billing=cancel`,
  });
  if (!session.url) throw new Error("checkout session has no url");
  return { url: session.url };
}

// Open the Stripe Billing Portal so a paying tenant can manage/cancel their sub.
export async function createPortal(tenant: string): Promise<{ url: string }> {
  if (!cfg.stripeSecret) throw new Error("billing disabled");
  const t = await getTenant(tenant);
  if (!t?.stripe_customer_id) throw new Error("no customer");
  const s = await stripe().billingPortal.sessions.create({
    customer: t.stripe_customer_id,
    return_url: `${cfg.baseUrl}/dashboard`,
  });
  return { url: s.url };
}

// Best-effort in-memory dedup for Stripe event IDs. Stripe may deliver the same event
// more than once; we skip re-processing events we've already handled this process lifetime.
// NOTE: this Set resets on every redeploy — a durable DB-backed version is a future
// improvement for production-grade exactly-once guarantees.
const _processedEventIds = new Set<string>();
const _MAX_PROCESSED_IDS = 1000;

// Verify + apply a Stripe webhook. Signature verification is the ONLY perimeter for
// this unauthenticated route — a bad/absent signature must throw (caller → 400).
export async function handleWebhook(rawBody: string, sig: string): Promise<void> {
  if (!cfg.stripeWebhookSecret) throw new Error("webhook secret not configured");
  // constructEventAsync uses WebCrypto — works in Bun/edge without a sync crypto shim.
  const event = await stripe().webhooks.constructEventAsync(rawBody, sig, cfg.stripeWebhookSecret);

  // Idempotency guard: skip events we've already applied this process lifetime.
  if (_processedEventIds.has(event.id)) return;
  // Evict the oldest entry when the Set is at capacity (insertion-order eviction).
  if (_processedEventIds.size >= _MAX_PROCESSED_IDS) {
    _processedEventIds.delete(_processedEventIds.values().next().value!);
  }
  _processedEventIds.add(event.id);

  const db = sb();
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as any;
      const slug = s.client_reference_id ?? s.metadata?.tenant;
      if (slug) {
        const { error } = await db
          .from("tenants")
          .update({
            plan: s.metadata?.plan ?? "starter",
            stripe_customer_id: s.customer,
            stripe_subscription_id: s.subscription,
          })
          .eq("slug", slug);
        if (error) throw error;
      }
      break;
    }
    case "customer.subscription.deleted": {
      // Sub canceled/expired → drop back to trial limits.
      const s = event.data.object as any;
      const { error } = await db.from("tenants").update({ plan: "trial" }).eq("stripe_subscription_id", s.id);
      if (error) throw error;
      break;
    }
  }
}
