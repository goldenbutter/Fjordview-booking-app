import Link from "next/link";
import { Eye, FileJson, FileText, Printer } from "lucide-react";
import { BookingTable } from "@/components/admin/admin-cards";
import { getAdminSnapshot } from "@/lib/admin-metrics";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function AdminInvoicesPage() {
  const snapshot = await getAdminSnapshot();

  if (!snapshot) {
    return (
      <main className="space-y-5 p-5">
        <h1 className="text-3xl font-semibold">Invoices</h1>
        <p className="mt-1 text-rose-700">Property not found.</p>
      </main>
    );
  }

  return (
    <main className="space-y-5 p-5">
      <div>
        <h1 className="text-3xl font-semibold">Invoices</h1>
        <p className="mt-1 text-slate-500">View, print, or fetch invoice data for confirmed bookings.</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Guest</th>
              <th className="px-4 py-3">Stay</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {snapshot.recentBookings.map((booking) => (
              <tr key={booking.id}>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 font-semibold text-slate-950">
                    <FileText className="h-4 w-4 text-teal-600" />
                    {booking.bookingRef}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">{booking.guestName}</td>
                <td className="px-4 py-3 text-slate-700">
                  {formatDate(booking.checkIn)} – {formatDate(booking.checkOut)}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {formatCurrency(booking.totalPrice, booking.currency)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/invoices/${booking.id}`}
                      title="View invoice"
                      aria-label={`View invoice ${booking.bookingRef}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/admin/invoices/${booking.id}?print=1`}
                      title="Open print view"
                      aria-label={`Print invoice ${booking.bookingRef}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                    >
                      <Printer className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/api/admin/invoices/${booking.id}`}
                      title="Raw JSON"
                      aria-label={`JSON for ${booking.bookingRef}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                    >
                      <FileJson className="h-4 w-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section>
        <h2 className="mb-3 text-xl font-semibold">All bookings</h2>
        <BookingTable bookings={snapshot.recentBookings} />
      </section>
    </main>
  );
}
