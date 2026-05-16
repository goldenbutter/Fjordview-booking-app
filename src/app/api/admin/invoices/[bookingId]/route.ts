import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { createInvoiceText } from "@/lib/invoice";
import { getBookingByRef } from "@/lib/db/queries";

async function invoiceResponse(params: Promise<{ bookingId: string }>) {
  const { bookingId } = await params;

  // Accept either a UUID id or a booking ref for convenience
  const db = getDb();
  const byId = await db
    .select({ ref: schema.bookings.bookingRef })
    .from(schema.bookings)
    .where(eq(schema.bookings.id, bookingId))
    .limit(1);
  const ref = byId[0]?.ref ?? bookingId;

  const result = await getBookingByRef(ref);
  if (!result) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  return NextResponse.json({
    mode: "local-demo",
    invoice: createInvoiceText({
      property: result.property,
      booking: result.booking,
      guest: result.guest,
      roomType: result.roomType,
    }),
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  return invoiceResponse(params);
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  return invoiceResponse(params);
}
