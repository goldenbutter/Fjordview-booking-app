import { NextResponse } from "next/server";
import { z } from "zod";
import { bookingRefSchema, validationError } from "@/lib/api-validation";
import { cancelBooking, getBookingByRef } from "@/lib/db/queries";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email";
import { refundPaymentIntent } from "@/lib/stripe";

const schema = z.object({
  email: z.string().email(),
  reason: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ref: string }> },
) {
  const { ref } = await params;
  const decodedRef = decodeURIComponent(ref);
  const parsedRef = bookingRefSchema.safeParse(decodedRef);
  if (!parsedRef.success) {
    return NextResponse.json(validationError("Invalid booking reference"), { status: 400 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await cancelBooking({
    ref: decodedRef,
    email: parsed.data.email,
    reason: parsed.data.reason,
  });

  if (!result.ok) {
    const statusMap: Record<typeof result.reason, number> = {
      "not-found": 404,
      "email-mismatch": 403,
      "already-cancelled": 409,
      "past-deadline": 422,
    };
    return NextResponse.json({ error: result.reason }, { status: statusMap[result.reason] });
  }
  const refund =
    result.refundAmount > 0 && result.booking.stripePaymentIntentId
      ? await refundPaymentIntent({
          paymentIntentId: result.booking.stripePaymentIntentId,
          amount: result.refundAmount,
          bookingRef: result.booking.bookingRef,
        })
      : { mode: "local-demo" as const, id: null };
  const detail = await getBookingByRef(result.booking.bookingRef, parsed.data.email);
  if (detail) {
    const selfServiceUrl = `${env.appUrl}/booking/${encodeURIComponent(detail.booking.bookingRef)}?email=${encodeURIComponent(detail.guest.email)}`;
    await sendEmail({ ...detail, selfServiceUrl, type: "cancellation" });
  }

  return NextResponse.json({
    booking: result.booking,
    refundAmount: result.refundAmount,
    policy: result.policy,
    mode: refund.mode,
    refundId: refund.id,
  });
}
