import { NextResponse } from "next/server";
import { bookingGuestName, roomNumber, roomTypeName } from "@/lib/admin-metrics";
import { demoBookings } from "@/lib/db/seed";

function csvEscape(value: string | number | undefined) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export async function GET() {
  const rows = [
    ["booking_ref", "guest", "room", "room_type", "check_in", "check_out", "status", "payment_status", "source", "total_ore"],
    ...demoBookings.map((booking) => [
      booking.bookingRef,
      bookingGuestName(booking.guestId),
      roomNumber(booking.roomId),
      roomTypeName(booking.roomTypeId),
      booking.checkIn,
      booking.checkOut,
      booking.status,
      booking.paymentStatus,
      booking.source,
      booking.totalPrice,
    ]),
  ];
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=fjordview-booking-report.csv",
    },
  });
}
