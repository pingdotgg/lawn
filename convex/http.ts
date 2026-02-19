import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Stripe webhook handler
http.route({
  path: "/webhooks/stripe",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeWebhookSecret) {
      console.error("Stripe webhook secret not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing signature", { status: 401 });
    }

    const body = await request.text();

    // In production, you would verify the signature using Stripe's library
    // For now, we'll parse the event directly
    let event;
    try {
      event = JSON.parse(body);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        // Update team's subscription status
        console.log("Checkout completed:", session.id);
        // TODO: Update team's stripeSubscriptionId and plan
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        console.log("Subscription updated:", subscription.id);
        // TODO: Update team's plan based on subscription
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        console.log("Subscription deleted:", subscription.id);
        // TODO: Downgrade team to free plan
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        console.log("Payment failed:", invoice.id);
        // TODO: Handle failed payment (notify team, retry logic)
        break;
      }
      default:
        console.log("Unhandled event type:", event.type);
    }

    return new Response("OK", { status: 200 });
  }),
});

http.route({
  path: "/webhooks/chunkify",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const rawBody = await request.text();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    try {
      const result = await ctx.runAction(internal.chunkifyActions.processWebhook, {
        rawBody,
        headers,
      });

      return new Response(result.message, { status: result.status });
    } catch (error) {
      console.error("Chunkify webhook proxy failed", error);
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
