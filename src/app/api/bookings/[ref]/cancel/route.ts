import { NextResponse } from "next/server";
import { z } from "zod";
import { bookingRefSchema, validationError } from "@/lib/api-validation";
import { cancelBooking } from "@/lib/db/queries";

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

  return NextResponse.json({
    booking: result.booking,
    refundAmount: result.refundAmount,
    policy: result.policy,
    mode: "local-demo",
  });
}
