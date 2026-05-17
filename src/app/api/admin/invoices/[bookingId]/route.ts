import { NextResponse } from "next/server";
import { getCurrentAdminContext } from "@/lib/admin-context";
import { createInvoiceText } from "@/lib/invoice";
import { getBookingDetailForProperty } from "@/lib/db/queries";

async function invoiceResponse(params: Promise<{ bookingId: string }>) {
  const { bookingId } = await params;

  // Accepts either a UUID id or a booking ref for convenience.
  const context = await getCurrentAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Admin property not available" }, { status: 401 });
  }
  const result = await getBookingDetailForProperty(context.property.id, bookingId);
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
