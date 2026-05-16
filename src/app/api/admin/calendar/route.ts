import { NextResponse } from "next/server";
import { z } from "zod";
import { dateStringSchema, validationError } from "@/lib/api-validation";
import { demoBookings, demoRooms } from "@/lib/db/seed";
import { rangesOverlap } from "@/lib/availability";

const calendarQuerySchema = z
  .object({
    start: dateStringSchema.default("2026-05-16"),
    end: dateStringSchema.default("2026-05-23"),
  })
  .refine((value) => value.end > value.start, {
    message: "end must be after start",
  });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsedQuery = calendarQuerySchema.safeParse({
    start: searchParams.get("start") ?? undefined,
    end: searchParams.get("end") ?? undefined,
  });
  if (!parsedQuery.success) {
    return NextResponse.json(validationError("Valid start and end dates are required"), { status: 400 });
  }

  const { start, end } = parsedQuery.data;
  const bookings = demoBookings.filter(
    (booking) =>
      !["cancelled", "no_show"].includes(booking.status) &&
      rangesOverlap(start, end, booking.checkIn, booking.checkOut),
  );

  return NextResponse.json({ rooms: demoRooms, bookings, start, end });
}
