import { NextResponse } from "next/server";
import { constructStripeEvent } from "@/lib/stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  try {
    const event = await constructStripeEvent(body, signature);
    return NextResponse.json({
      received: true,
      eventType: event.type,
      mode: event.type === "local.demo" ? "local-demo" : "stripe",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid webhook" },
      { status: 400 },
    );
  }
}
