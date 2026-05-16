import { NextResponse } from "next/server";
import { z } from "zod";
import { demoBookings, demoCancellationPolicy, demoGuests } from "@/lib/db/seed";

const schema = z.object({
  email: z.string().email(),
  reason: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ref: string }> },
) {
  const { ref } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const booking = demoBookings.find((item) => item.bookingRef === decodeURIComponent(ref));
  const guest = booking ? demoGuests.find((item) => item.id === booking.guestId) : undefined;
  if (!booking || !guest || guest.email.toLowerCase() !== parsed.data.email.toLowerCase()) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  return NextResponse.json({
    booking: { ...booking, status: "cancelled", paymentStatus: "refunded" },
    refundAmount: Math.round(booking.paidAmount * (demoCancellationPolicy.refundPct / 100)),
    policy: demoCancellationPolicy,
    mode: "local-demo",
  });
}
