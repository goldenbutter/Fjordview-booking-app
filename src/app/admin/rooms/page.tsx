import { getAdminSnapshot } from "@/lib/admin-metrics";
import { RoomManagement } from "./room-management";

export default async function AdminRoomsPage() {
  const snapshot = await getAdminSnapshot();

  if (!snapshot) {
    return (
      <main className="space-y-5 p-5">
        <h1 className="text-3xl font-semibold">Rooms</h1>
        <p className="mt-1 text-rose-700">Property not found.</p>
      </main>
    );
  }

  return (
    <main className="space-y-5 p-5">
      <div>
        <h1 className="text-3xl font-semibold">Rooms</h1>
        <p className="mt-1 text-slate-500">Create, edit, and deactivate room types and physical room inventory.</p>
      </div>
      <RoomManagement bookings={snapshot.recentBookings} rooms={snapshot.rooms} roomTypes={snapshot.roomTypes} />
    </main>
  );
}
