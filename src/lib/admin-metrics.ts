import {
  demoBookings,
  demoCleaningTasks,
  demoGuests,
  demoPricingRules,
  demoProperty,
  demoRoomTypes,
  demoRooms,
} from "@/lib/db/seed";

export function getAdminSnapshot() {
  const totalRooms = demoRooms.length;
  const activeBookings = demoBookings.filter((booking) => !["cancelled", "no_show"].includes(booking.status));
  const occupiedRooms = new Set(activeBookings.map((booking) => booking.roomId).filter(Boolean)).size;
  const revenue = demoBookings.reduce((sum, booking) => sum + booking.paidAmount, 0);

  return {
    property: demoProperty,
    totalRooms,
    occupiedRooms,
    occupancyPct: Math.round((occupiedRooms / totalRooms) * 100),
    revenue,
    arrivals: demoBookings.filter((booking) => booking.checkIn <= "2026-06-20").slice(0, 4),
    departures: demoBookings.filter((booking) => booking.checkOut >= "2026-05-16").slice(0, 4),
    recentBookings: demoBookings.slice().reverse(),
    guests: demoGuests,
    rooms: demoRooms,
    roomTypes: demoRoomTypes,
    pricingRules: demoPricingRules,
    cleaningTasks: demoCleaningTasks,
  };
}

export function bookingGuestName(guestId: string) {
  const guest = demoGuests.find((item) => item.id === guestId);
  return guest ? `${guest.firstName} ${guest.lastName}` : "Unknown guest";
}

export function roomTypeName(roomTypeId: string) {
  return demoRoomTypes.find((item) => item.id === roomTypeId)?.name.en ?? "Room type";
}

export function roomNumber(roomId?: string) {
  return demoRooms.find((item) => item.id === roomId)?.roomNumber ?? "Unassigned";
}
