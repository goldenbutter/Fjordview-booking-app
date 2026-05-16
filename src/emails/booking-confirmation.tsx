import type { Booking, Guest, Property, RoomType } from "@/types";

export function BookingConfirmationEmail({
  property,
  booking,
  guest,
  roomType,
}: {
  property: Property;
  booking: Booking;
  guest: Guest;
  roomType: RoomType;
}) {
  return (
    <div>
      <h1>{property.name}</h1>
      <p>
        Hi {guest.firstName}, your booking {booking.bookingRef} for {roomType.name[booking.language]} is confirmed.
      </p>
    </div>
  );
}
