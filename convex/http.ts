import { registerRoutes } from "@convex-dev/stripe";
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import type Stripe from "stripe";
import { components, internal } from "./_generated/api";

const http = httpRouter();

function getSubscriptionPriceId(subscription: Stripe.Subscription): string | undefined {
  return subscription.items.data[0]?.price?.id;
}

function getSubscriptionOrgId(subscription: Stripe.Subscription): string | undefined {
  const orgId = subscription.metadata.orgId;
  return typeof orgId === "string" && orgId.length > 0 ? orgId : undefined;
}

registerRoutes(http, components.stripe, {
  webhookPath: "/stripe/webhook",
  events: {
    "customer.subscription.created": async (
      ctx,
      event: Stripe.Event & { type: "customer.subscription.created" },
    ) => {
      const subscription = event.data.object as Stripe.Subscription;
      await ctx.runMutation(internal.billing.syncTeamSubscriptionFromWebhook, {
        orgId: getSubscriptionOrgId(subscription),
        stripeCustomerId:
          typeof subscription.customer === "string" ? subscription.customer : undefined,
        stripeSubscriptionId: subscription.id,
        stripePriceId: getSubscriptionPriceId(subscription),
        status: subscription.status,
      });
    },
    "customer.subscription.updated": async (
      ctx,
      event: Stripe.Event & { type: "customer.subscription.updated" },
    ) => {
      const subscription = event.data.object as Stripe.Subscription;
      await ctx.runMutation(internal.billing.syncTeamSubscriptionFromWebhook, {
        orgId: getSubscriptionOrgId(subscription),
        stripeCustomerId:
          typeof subscription.customer === "string" ? subscription.customer : undefined,
        stripeSubscriptionId: subscription.id,
        stripePriceId: getSubscriptionPriceId(subscription),
        status: subscription.status,
      });
    },
    "customer.subscription.deleted": async (
      ctx,
      event: Stripe.Event & { type: "customer.subscription.deleted" },
    ) => {
      const subscription = event.data.object as Stripe.Subscription;
      await ctx.runMutation(internal.billing.syncTeamSubscriptionFromWebhook, {
        orgId: getSubscriptionOrgId(subscription),
        stripeCustomerId:
          typeof subscription.customer === "string" ? subscription.customer : undefined,
        stripeSubscriptionId: subscription.id,
        stripePriceId: getSubscriptionPriceId(subscription),
        status: subscription.status,
      });
    },
  },
});

http.route({
  path: "/webhooks/mux",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const rawBody = await request.text();
    const signature = request.headers.get("mux-signature") ?? undefined;

    try {
      const result = await ctx.runAction(internal.muxActions.processWebhook, {
        rawBody,
        signature,
      });

      return new Response(result.message, { status: result.status });
    } catch (error) {
      console.error("Mux webhook proxy failed", error);
      return new Response("Webhook processing failed", { status: 500 });
    }
  }),
});

// Health check endpoint
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response("OK", { status: 200 });
  }),
});

export default http;
