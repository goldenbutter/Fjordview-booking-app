import { NextResponse } from "next/server";
import { z } from "zod";
import { autoAssignRoom, getAvailableRoomTypes } from "@/lib/availability";
import { createBookingRef } from "@/lib/booking-ref";
import { demoBookings, demoGuests, demoProperty } from "@/lib/db/seed";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

const schema = z.object({
  roomTypeId: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  guestCount: z.number().int().min(1),
  guest: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    country: z.string().optional(),
    language: z.enum(["no", "en"]),
  }),
  specialRequests: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const limit = checkRateLimit(rateLimitKey(request, "booking-create"), 12);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many booking attempts" }, { status: 429 });
  }

  const { slug } = await params;
  if (slug !== demoProperty.slug) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const available = getAvailableRoomTypes(demoProperty.id, input.checkIn, input.checkOut);
  const roomType = available.find((room) => room.id === input.roomTypeId);

  if (!roomType) {
    return NextResponse.json({ error: "Selected room type is not available" }, { status: 409 });
  }

  const room = autoAssignRoom({
    propertyId: demoProperty.id,
    roomTypeId: input.roomTypeId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
  });
  const sequence = demoBookings.length + 1;
  const bookingRef = createBookingRef(demoProperty.bookingRefPrefix, sequence);
  const guestId = `guest_${input.guest.email.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`;

  const booking = {
    id: `booking_${Date.now()}`,
    propertyId: demoProperty.id,
    roomId: room?.id,
    roomTypeId: input.roomTypeId,
    guestId,
    bookingRef,
    status: "confirmed" as const,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guestCount: input.guestCount,
    totalPrice: roomType.price.subtotal,
    currency: demoProperty.currency,
    paymentStatus: "fully_paid" as const,
    paidAmount: roomType.price.subtotal,
    specialRequests: input.specialRequests,
    source: "direct" as const,
    language: input.guest.language,
    createdAt: new Date().toISOString(),
  };

  const guest = {
    id: guestId,
    propertyId: demoProperty.id,
    email: input.guest.email,
    firstName: input.guest.firstName,
    lastName: input.guest.lastName,
    phone: input.guest.phone,
    country: input.guest.country,
    language: input.guest.language,
    totalBookings: 1,
    totalSpent: roomType.price.subtotal,
  };

  return NextResponse.json({
    mode: "local-demo",
    booking,
    guest,
    roomType,
    room,
    checkoutUrl: `/booking/${bookingRef}?success=true&email=${encodeURIComponent(input.guest.email)}`,
    existingGuests: demoGuests.length,
  });
}
