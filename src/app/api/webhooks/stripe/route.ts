import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Forward to Convex HTTP endpoint
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json({ error: "Convex URL not configured" }, { status: 500 });
  }

  const httpUrl = convexUrl.replace(".convex.cloud", ".convex.site");

  try {
    const body = await request.text();
    const response = await fetch(`${httpUrl}/webhooks/stripe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": request.headers.get("stripe-signature") || "",
      },
      body,
    });

    return NextResponse.json(
      { success: response.ok },
      { status: response.status }
    );
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
