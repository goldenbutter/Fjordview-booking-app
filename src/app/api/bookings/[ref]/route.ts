import { NextResponse } from "next/server";
import { z } from "zod";
import { bookingRefSchema, validationError } from "@/lib/api-validation";
import { demoBookings, demoGuests, demoProperty, demoRoomTypes, demoRooms } from "@/lib/db/seed";

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

  const email = parsedQuery.data.email?.toLowerCase();
  const booking = demoBookings.find((item) => item.bookingRef === decodedRef);

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
