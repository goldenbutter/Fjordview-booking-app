import { BarChart3, Download } from "lucide-react";
import { StatCard } from "@/components/admin/admin-cards";
import { Button } from "@/components/ui/button";
import { getAdminSnapshot } from "@/lib/admin-metrics";
import { formatCurrency } from "@/lib/utils";

export default function AdminReportsPage() {
  const snapshot = getAdminSnapshot();
  return (
    <main className="space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Reports</h1>
          <p className="mt-1 text-slate-500">Occupancy, revenue, and booking source summaries.</p>
        </div>
        <Button variant="secondary"><Download className="h-4 w-4" /> CSV export</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Occupancy" value={`${snapshot.occupancyPct}%`} detail="By current demo bookings" />
        <StatCard label="Revenue" value={formatCurrency(snapshot.revenue)} detail="All demo payments" />
        <StatCard label="Direct bookings" value="50%" detail="Source mix prototype" />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 font-semibold"><BarChart3 className="h-5 w-5 text-teal-600" /> Monthly trend</div>
        <div className="flex h-56 items-end gap-3">
          {[38, 52, 49, 64, 71, 58, 77, 69].map((value, index) => (
            <div key={index} className="flex flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-t-md bg-teal-500" style={{ height: `${value}%` }} />
              <span className="text-xs text-slate-500">M{index + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
