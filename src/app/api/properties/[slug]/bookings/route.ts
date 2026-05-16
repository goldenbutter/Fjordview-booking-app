import { NextResponse } from "next/server";
import { z } from "zod";
import { propertySlugSchema, validationError } from "@/lib/api-validation";
import { createBooking, getAvailability, getPropertyBySlug } from "@/lib/db/queries";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

const schema = z.object({
  roomTypeId: z.string().uuid(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
  const parsedSlug = propertySlugSchema.safeParse(slug);
  if (!parsedSlug.success) {
    return NextResponse.json(validationError("Invalid property slug"), { status: 400 });
  }

  const property = await getPropertyBySlug(slug);
  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  if (input.checkOut <= input.checkIn) {
    return NextResponse.json({ error: "checkOut must be after checkIn" }, { status: 400 });
  }

  const available = await getAvailability(property.id, input.checkIn, input.checkOut);
  const roomType = available.find((r) => r.id === input.roomTypeId);
  if (!roomType) {
    return NextResponse.json({ error: "Selected room type is not available" }, { status: 409 });
  }

  try {
    const result = await createBooking({
      propertyId: property.id,
      roomTypeId: input.roomTypeId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guestCount: input.guestCount,
      totalPrice: roomType.price.subtotal,
      currency: property.currency,
      language: input.guest.language,
      specialRequests: input.specialRequests,
      guest: {
        firstName: input.guest.firstName,
        lastName: input.guest.lastName,
        email: input.guest.email,
        phone: input.guest.phone,
        country: input.guest.country,
      },
    });

    return NextResponse.json({
      mode: "local-demo",
      booking: result.booking,
      guest: result.guest,
      roomType: { ...result.roomType, price: roomType.price },
      room: result.room,
      checkoutUrl: `/booking/${result.booking.bookingRef}?success=true&email=${encodeURIComponent(input.guest.email)}`,
    });
  } catch (err) {
    console.error("[bookings.POST]", err);
    return NextResponse.json({ error: "Could not create booking" }, { status: 500 });
  }
}
