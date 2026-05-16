import { NextResponse } from "next/server";
import { demoBookings, demoRooms } from "@/lib/db/seed";
import { rangesOverlap } from "@/lib/availability";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start") ?? "2026-05-16";
  const end = searchParams.get("end") ?? "2026-05-23";
  const bookings = demoBookings.filter(
    (booking) =>
      !["cancelled", "no_show"].includes(booking.status) &&
      rangesOverlap(start, end, booking.checkIn, booking.checkOut),
  );

  return NextResponse.json({ rooms: demoRooms, bookings, start, end });
}
