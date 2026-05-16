import { NextResponse } from "next/server";
import { createInvoiceText } from "@/lib/invoice";
import { getBookingDetail } from "@/lib/db/queries";

async function invoiceResponse(params: Promise<{ bookingId: string }>) {
  const { bookingId } = await params;

  // Accepts either a UUID id or a booking ref for convenience.
  const result = await getBookingDetail(bookingId);
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
