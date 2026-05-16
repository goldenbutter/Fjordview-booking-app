import type { Booking, Guest, Property, RoomType } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export function createInvoiceText(input: {
  property: Property;
  booking: Booking;
  guest: Guest;
  roomType: RoomType;
}) {
  return [
    `Invoice - ${input.booking.bookingRef}`,
    input.property.name,
    `${input.property.address}, ${input.property.city}`,
    "",
    `Guest: ${input.guest.firstName} ${input.guest.lastName}`,
    `Room: ${input.roomType.name.en}`,
    `Stay: ${formatDate(input.booking.checkIn)} - ${formatDate(input.booking.checkOut)}`,
    `Total: ${formatCurrency(input.booking.totalPrice, input.booking.currency)}`,
    "",
    "Prototype invoice text. Production can replace this with a PDF renderer.",
  ].join("\n");
}
