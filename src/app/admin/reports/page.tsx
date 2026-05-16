import Link from "next/link";
import { BarChart3, Download } from "lucide-react";
import { StatCard } from "@/components/admin/admin-cards";
import { getAdminSnapshot } from "@/lib/admin-metrics";
import { formatCurrency } from "@/lib/utils";

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

  const directCount = snapshot.recentBookings.filter((b) => b.source === "direct").length;
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
        <div className="mb-4 flex items-center gap-2 font-semibold"><BarChart3 className="h-5 w-5 text-teal-600" /> Monthly trend (placeholder)</div>
        <div className="grid h-56 grid-cols-8 items-end gap-3">
          {[38, 52, 49, 64, 71, 58, 77, 69].map((value, index) => (
            <div key={index} className="flex h-full flex-col justify-end gap-2">
              <div className="w-full rounded-t-md bg-teal-500" style={{ height: `${value}%` }} />
              <span className="text-center text-xs text-slate-500">M{index + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
