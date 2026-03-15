import { Hono } from "hono";
import type { Env } from "../../lib/types";

const checkoutApi = new Hono<Env>();

// POST /api/checkout — create a Stripe Checkout session for the $1M/mo plan
checkoutApi.post("/", async (c) => {
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": c.env.STRIPE_PRICE_ID,
      "line_items[0][quantity]": "1",
      success_url: `${c.env.APP_URL}/app?welcome=pro`,
      cancel_url: `${c.env.APP_URL}/pricing`,
    }),
  });

  const session = (await res.json()) as any;

  if (!session.url) {
    return c.json({ error: "Failed to create checkout session" }, 500);
  }

  return c.redirect(session.url);
});

export { checkoutApi };
