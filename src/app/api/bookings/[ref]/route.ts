import { NextResponse } from "next/server";
import { z } from "zod";
import { bookingRefSchema, validationError } from "@/lib/api-validation";
import { getBookingByRef } from "@/lib/db/queries";

const bookingLookupQuerySchema = z.object({
  email: z.string().email().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ref: string }> },
) {
  const { ref } = await params;
  const decodedRef = decodeURIComponent(ref);
  const parsedRef = bookingRefSchema.safeParse(decodedRef);
  if (!parsedRef.success) {
    return NextResponse.json(validationError("Invalid booking reference"), { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = bookingLookupQuerySchema.safeParse({
    email: searchParams.get("email") ?? undefined,
  });
  if (!parsedQuery.success) {
    return NextResponse.json(validationError("Invalid email"), { status: 400 });
  }

  const result = await getBookingByRef(decodedRef, parsedQuery.data.email);
  if (!result) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
