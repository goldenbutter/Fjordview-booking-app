import { demoBookings, demoPricingRules, demoRooms, demoRoomTypes } from "@/lib/db/seed";
import { calculateStayPrice } from "@/lib/pricing";
import type { Booking } from "@/types";

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && aEnd > bStart;
}

export function getAvailableRoomTypes(propertyId: string, checkIn: string, checkOut: string) {
  return demoRoomTypes
    .filter((roomType) => roomType.propertyId === propertyId && roomType.active)
    .map((roomType) => {
      const rooms = demoRooms.filter(
        (room) => room.propertyId === propertyId && room.roomTypeId === roomType.id && room.active,
      );
      const bookedRoomIds = new Set(
        demoBookings
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
        demoPricingRules.filter((rule) => !rule.roomTypeId || rule.roomTypeId === roomType.id),
      );

      return {
        ...roomType,
        totalRooms: rooms.length,
        availableCount: Math.max(0, rooms.length - bookedRoomIds.size),
        price,
      };
    })
    .filter((roomType) => roomType.availableCount > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function autoAssignRoom(booking: Pick<Booking, "roomTypeId" | "checkIn" | "checkOut" | "propertyId">) {
  const candidates = demoRooms.filter(
    (room) => room.propertyId === booking.propertyId && room.roomTypeId === booking.roomTypeId && room.active,
  );

  const available = candidates.filter(
    (room) =>
      !demoBookings.some(
        (existing) =>
          existing.roomId === room.id &&
          !["cancelled", "no_show"].includes(existing.status) &&
          rangesOverlap(booking.checkIn, booking.checkOut, existing.checkIn, existing.checkOut),
      ),
  );

  return available[0] ?? null;
}
