import { NextResponse } from "next/server";
import { createInvoiceText } from "@/lib/invoice";
import { demoBookings, demoGuests, demoProperty, demoRoomTypes } from "@/lib/db/seed";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await params;
  const booking = demoBookings.find((item) => item.id === bookingId);
  const guest = booking ? demoGuests.find((item) => item.id === booking.guestId) : undefined;
  const roomType = booking ? demoRoomTypes.find((item) => item.id === booking.roomTypeId) : undefined;

  if (!booking || !guest || !roomType) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  return NextResponse.json({
    mode: "local-demo",
    invoice: createInvoiceText({ property: demoProperty, booking, guest, roomType }),
  });
}
