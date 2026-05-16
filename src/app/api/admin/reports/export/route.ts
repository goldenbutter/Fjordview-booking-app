import { NextResponse } from "next/server";
import { getAdminSnapshot } from "@/lib/admin-metrics";

function csvEscape(value: string | number | undefined) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export async function GET() {
  const snapshot = await getAdminSnapshot();
  if (!snapshot) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const rows = [
    ["booking_ref", "guest", "room", "room_type", "check_in", "check_out", "status", "payment_status", "source", "total_ore"],
    ...snapshot.recentBookings.map((booking) => [
      booking.bookingRef,
      booking.guestName,
      booking.roomLabel,
      booking.roomTypeLabel,
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
      "content-disposition": `attachment; filename=${snapshot.property.slug}-booking-report.csv`,
    },
  });
}
