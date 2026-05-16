import { BookingTable, StatCard } from "@/components/admin/admin-cards";
import { getAdminSnapshot } from "@/lib/admin-metrics";
import { formatCurrency } from "@/lib/utils";

export default function AdminDashboardPage() {
  const snapshot = getAdminSnapshot();

  return (
    <main className="space-y-6 p-5">
      <div>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-slate-500">Today&apos;s operating view for {snapshot.property.name}.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Occupancy" value={`${snapshot.occupancyPct}%`} detail={`${snapshot.occupiedRooms}/${snapshot.totalRooms} rooms occupied`} />
        <StatCard label="Revenue" value={formatCurrency(snapshot.revenue)} detail="Demo revenue recorded" />
        <StatCard label="Arrivals" value={String(snapshot.arrivals.length)} detail="Upcoming arrivals sample" />
        <StatCard label="Cleaning" value={String(snapshot.cleaningTasks.length)} detail="Open housekeeping tasks" />
      </div>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Recent bookings</h2>
        <BookingTable bookings={snapshot.recentBookings} />
      </section>
    </main>
  );
}
