import { RoomInventory } from "@/components/admin/admin-cards";
import { getAdminSnapshot } from "@/lib/admin-metrics";

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

  const roomTypeNameById = new Map(snapshot.roomTypes.map((rt) => [rt.id, rt.name.en]));

  return (
    <main className="space-y-5 p-5">
      <div>
        <h1 className="text-3xl font-semibold">Rooms</h1>
        <p className="mt-1 text-slate-500">Room types and physical room inventory.</p>
      </div>
      <RoomInventory rooms={snapshot.rooms} roomTypes={snapshot.roomTypes} />
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold">Physical rooms</h2>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.rooms.map((room) => (
            <div key={room.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
              <span className="font-semibold">Room {room.roomNumber}</span>
              <span className="text-slate-500">{roomTypeNameById.get(room.roomTypeId) ?? "Room type"} · Floor {room.floor}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
