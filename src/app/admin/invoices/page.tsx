import Link from "next/link";
import { FileText } from "lucide-react";
import { BookingTable } from "@/components/admin/admin-cards";
import { getAdminSnapshot } from "@/lib/admin-metrics";

export default function AdminInvoicesPage() {
  const snapshot = getAdminSnapshot();

  return (
    <main className="space-y-5 p-5">
      <div>
        <h1 className="text-3xl font-semibold">Invoices</h1>
        <p className="mt-1 text-slate-500">Generate local-demo invoice text for confirmed bookings.</p>
      </div>
      <div className="grid gap-3">
        {snapshot.recentBookings.map((booking) => (
          <Link
            key={booking.id}
            href={`/api/admin/invoices/${booking.id}`}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300"
          >
            <span className="flex items-center gap-3 font-semibold text-slate-950">
              <FileText className="h-5 w-5 text-teal-600" />
              {booking.bookingRef}
            </span>
            <span className="text-sm text-slate-500">Open invoice JSON</span>
          </Link>
        ))}
      </div>
      <BookingTable bookings={snapshot.recentBookings} />
    </main>
  );
}
