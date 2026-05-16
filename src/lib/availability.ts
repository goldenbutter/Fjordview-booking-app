import { calculateStayPrice } from "@/lib/pricing";
import type { Booking, PricingRule, Room, RoomType } from "@/types";

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && aEnd > bStart;
}

export type AvailableRoomType = RoomType & {
  totalRooms: number;
  availableCount: number;
  price: ReturnType<typeof calculateStayPrice>;
};

export function getAvailableRoomTypes(
  propertyId: string,
  checkIn: string,
  checkOut: string,
  roomTypes: RoomType[],
  rooms: Room[],
  bookings: Booking[],
  pricingRules: PricingRule[],
): AvailableRoomType[] {
  return roomTypes
    .filter((roomType) => roomType.propertyId === propertyId && roomType.active)
    .map((roomType) => {
      const typeRooms = rooms.filter(
        (room) => room.propertyId === propertyId && room.roomTypeId === roomType.id && room.active,
      );
      const bookedRoomIds = new Set(
        bookings
          .filter(
            (booking) =>
              booking.propertyId === propertyId &&
              booking.roomTypeId === roomType.id &&
              !["cancelled", "no_show"].includes(booking.status) &&
              rangesOverlap(checkIn, checkOut, booking.checkIn, booking.checkOut),
          )
          .map((booking) => booking.roomId)
          .filter(Boolean),
      );
      const price = calculateStayPrice(
        roomType.basePrice,
        checkIn,
        checkOut,
        pricingRules.filter((rule) => !rule.roomTypeId || rule.roomTypeId === roomType.id),
      );

      return {
        ...roomType,
        totalRooms: typeRooms.length,
        availableCount: Math.max(0, typeRooms.length - bookedRoomIds.size),
        price,
      };
    })
    .filter((roomType) => roomType.availableCount > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function autoAssignRoom(
  booking: Pick<Booking, "roomTypeId" | "checkIn" | "checkOut" | "propertyId">,
  rooms: Room[],
  existingBookings: Booking[],
): Room | null {
  const candidates = rooms.filter(
    (room) => room.propertyId === booking.propertyId && room.roomTypeId === booking.roomTypeId && room.active,
  );

  const available = candidates.filter(
    (room) =>
      !existingBookings.some(
        (existing) =>
          existing.roomId === room.id &&
          !["cancelled", "no_show"].includes(existing.status) &&
          rangesOverlap(booking.checkIn, booking.checkOut, existing.checkIn, existing.checkOut),
      ),
  );

  if (available.length === 0) return null;

  return (
    available.sort((a, b) => lastRoomCheckout(a.id, existingBookings) - lastRoomCheckout(b.id, existingBookings))[0] ??
    null
  );
}

function lastRoomCheckout(roomId: string, bookings: Booking[]) {
  const checkouts = bookings
    .filter((booking) => booking.roomId === roomId && !["cancelled", "no_show"].includes(booking.status))
    .map((booking) => new Date(booking.checkOut).getTime());
  return checkouts.length > 0 ? Math.max(...checkouts) : 0;
}
