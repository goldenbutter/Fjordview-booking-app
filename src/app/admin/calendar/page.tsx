import { CalendarGrid } from "@/components/admin/admin-cards";
import { getAdminSnapshot } from "@/lib/admin-metrics";

export default async function AdminCalendarPage() {
  const snapshot = await getAdminSnapshot();

  if (!snapshot) {
    return (
      <main className="space-y-5 p-5">
        <h1 className="text-3xl font-semibold">Calendar</h1>
        <p className="mt-1 text-rose-700">Property not found.</p>
      </main>
    );
  }

  return (
    <main className="space-y-5 p-5">
      <div>
        <h1 className="text-3xl font-semibold">Calendar</h1>
        <p className="mt-1 text-slate-500">Two-week room occupancy grid.</p>
      </div>
      <CalendarGrid bookings={snapshot.recentBookings} rooms={snapshot.rooms} />
    </main>
  );
}
