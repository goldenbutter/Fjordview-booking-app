import Link from "next/link";
import { BarChart3, Download } from "lucide-react";
import { StatCard } from "@/components/admin/admin-cards";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { getAdminSnapshot } from "@/lib/admin-metrics";
import { formatCurrency } from "@/lib/utils";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function AdminReportsPage() {
  const snapshot = await getAdminSnapshot();

  if (!snapshot) {
    return (
      <main className="space-y-5 p-5">
        <h1 className="text-3xl font-semibold">Reports</h1>
        <p className="mt-1 text-rose-700">Property not found.</p>
      </main>
    );
  }

  // Aggregate revenue by month from real bookings (use checkIn month)
  const monthlyRevenue = new Map<string, number>();
  for (const booking of snapshot.recentBookings) {
    if (["cancelled", "no_show"].includes(booking.status)) continue;
    const date = new Date(`${booking.checkIn}T00:00:00Z`);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    monthlyRevenue.set(key, (monthlyRevenue.get(key) ?? 0) + (booking.paidAmount ?? booking.totalPrice));
  }
  const sortedKeys = Array.from(monthlyRevenue.keys()).sort();
  const chartData = sortedKeys.map((key) => {
    const [, month] = key.split("-");
    return { month: MONTH_LABELS[parseInt(month, 10) - 1], revenue: monthlyRevenue.get(key) ?? 0 };
  });

  // Source breakdown
  const sourceCount: Record<string, number> = {};
  for (const booking of snapshot.recentBookings) {
    sourceCount[booking.source] = (sourceCount[booking.source] ?? 0) + 1;
  }
  const directCount = sourceCount.direct ?? 0;
  const directPct = snapshot.recentBookings.length > 0
    ? Math.round((directCount / snapshot.recentBookings.length) * 100)
    : 0;

  return (
    <main className="space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Reports</h1>
          <p className="mt-1 text-slate-500">Occupancy, revenue, and booking source summaries.</p>
        </div>
        <Link
          href="/api/admin/reports/export"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-teal-200 bg-white px-4 text-sm font-semibold text-teal-900 transition hover:bg-teal-50"
        >
          <Download className="h-4 w-4" /> CSV export
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Occupancy" value={`${snapshot.occupancyPct}%`} detail={`${snapshot.occupiedRooms}/${snapshot.totalRooms} occupied`} />
        <StatCard label="Revenue" value={formatCurrency(snapshot.revenue)} detail="All paid bookings" />
        <StatCard label="Direct bookings" value={`${directPct}%`} detail={`${directCount} of ${snapshot.recentBookings.length}`} />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 font-semibold">
          <BarChart3 className="h-5 w-5 text-teal-600" /> Revenue by check-in month
        </div>
        {chartData.length === 0 ? (
          <p className="text-sm text-slate-500">No bookings to chart yet.</p>
        ) : (
          <RevenueChart data={chartData} />
        )}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Booking sources</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(["direct", "admin", "api", "channel"] as const).map((source) => (
            <div key={source} className="rounded-md bg-slate-50 p-3">
              <div className="text-xs uppercase text-slate-500">{source}</div>
              <div className="mt-1 text-xl font-semibold">{sourceCount[source] ?? 0}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
