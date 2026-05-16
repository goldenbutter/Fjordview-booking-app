import { NextResponse } from "next/server";
import { demoBookings, demoGuests, demoProperty, demoRoomTypes, demoRooms } from "@/lib/db/seed";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ref: string }> },
) {
  const { ref } = await params;
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.toLowerCase();
  const booking = demoBookings.find((item) => item.bookingRef === decodeURIComponent(ref));

  if (!booking) {
    return NextResponse.json({ error: "Booking not found in seed data. Local browser-created bookings are loaded client-side." }, { status: 404 });
  }

  const guest = demoGuests.find((item) => item.id === booking.guestId);
  if (email && guest?.email.toLowerCase() !== email) {
    return NextResponse.json({ error: "Email does not match booking" }, { status: 403 });
  }

  return NextResponse.json({
    property: demoProperty,
    booking,
    guest,
    roomType: demoRoomTypes.find((item) => item.id === booking.roomTypeId),
    room: demoRooms.find((item) => item.id === booking.roomId),
  });
}
