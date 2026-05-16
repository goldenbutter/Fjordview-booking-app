import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminBooking, getAvailability, getPropertyBySlug } from "@/lib/db/queries";
import { env } from "@/lib/env";
import { getAdminSnapshot } from "@/lib/admin-metrics";

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
    language: z.enum(["no", "en"]).default("en"),
  }),
  specialRequests: z.string().optional(),
  totalPriceOverride: z.number().int().nonnegative().optional(),
  paymentStatus: z.enum(["unpaid", "deposit_paid", "fully_paid", "refunded", "partial_refund"]).optional(),
  paidAmount: z.number().int().nonnegative().optional(),
});

export async function GET() {
  const snapshot = await getAdminSnapshot();
  if (!snapshot) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }
  return NextResponse.json({ bookings: snapshot.recentBookings });
}

export async function POST(request: Request) {
  const property = await getPropertyBySlug(env.defaultPropertySlug);
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

  const totalPrice = input.totalPriceOverride ?? roomType.price.subtotal;

  try {
    const result = await createAdminBooking({
      propertyId: property.id,
      roomTypeId: input.roomTypeId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guestCount: input.guestCount,
      totalPrice,
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
      paymentStatus: input.paymentStatus,
      paidAmount: input.paidAmount,
    });
    return NextResponse.json({ booking: result.booking, guest: result.guest, room: result.room });
  } catch (err) {
    console.error("[admin.bookings.POST]", err);
    return NextResponse.json({ error: "Could not create booking" }, { status: 500 });
  }
}
