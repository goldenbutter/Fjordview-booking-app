import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { getActiveRoomTypes, getPropertyBySlug, listBookings } from "@/lib/db/queries";
import { env } from "@/lib/env";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_OPTIONS = ["pending", "confirmed", "checked_in", "checked_out", "cancelled", "no_show"];
const PAYMENT_OPTIONS = ["unpaid", "deposit_paid", "fully_paid", "refunded", "partial_refund"];

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    type?: string;
    payment?: string;
  }>;
}) {
  const query = await searchParams;
  const property = await getPropertyBySlug(env.defaultPropertySlug);
  if (!property) {
    return (
      <main className="space-y-5 p-5">
        <h1 className="text-3xl font-semibold">Bookings</h1>
        <p className="mt-1 text-rose-700">Property not found.</p>
      </main>
    );
  }

  const roomTypes = await getActiveRoomTypes(property.id);
  const { bookings, totalCount } = await listBookings(property.id, {
    search: query.search,
    status: query.status,
    roomTypeId: query.type,
    paymentStatus: query.payment,
  });

  const hasFilters = !!(query.search || query.status || query.type || query.payment);

  return (
    <main className="space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Bookings</h1>
          <p className="mt-1 text-slate-500">
            {hasFilters ? `${totalCount} matching` : `${totalCount} bookings on record`}
          </p>
        </div>
        <Link
          href="/admin/bookings/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" />
          Manual booking
        </Link>
      </div>

      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_160px_220px_160px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <TextInput
            name="search"
            defaultValue={query.search ?? ""}
            className="pl-9"
            placeholder="Search guest, email, or ref"
          />
        </div>
        <select
          name="status"
          aria-label="Filter by booking status"
          defaultValue={query.status ?? ""}
          className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
        <select
          name="type"
          aria-label="Filter by room type"
          defaultValue={query.type ?? ""}
          className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
        >
          <option value="">All room types</option>
          {roomTypes.map((rt) => (
            <option key={rt.id} value={rt.id}>{rt.name.en}</option>
          ))}
        </select>
        <select
          name="payment"
          aria-label="Filter by payment status"
          defaultValue={query.payment ?? ""}
          className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
        >
          <option value="">All payment states</option>
          {PAYMENT_OPTIONS.map((p) => (
            <option key={p} value={p}>{p.replace("_", " ")}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <Button type="submit">Apply</Button>
          {hasFilters ? (
            <Link
              href="/admin/bookings"
              className="inline-flex h-11 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              <X className="h-3 w-3" /> Clear
            </Link>
          ) : null}
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Guest</th>
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No bookings match these filters.</td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-teal-700">
                    <Link href={`/admin/bookings/${booking.id}`} className="hover:underline">
                      {booking.bookingRef}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{booking.guestName}</td>
                  <td className="px-4 py-3">{booking.roomLabel}</td>
                  <td className="px-4 py-3">{formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(booking.status)}>{booking.status.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={paymentTone(booking.paymentStatus)}>{booking.paymentStatus.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {formatCurrency(booking.totalPrice, booking.currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function statusTone(status: string) {
  switch (status) {
    case "confirmed": return "teal" as const;
    case "checked_in": return "green" as const;
    case "checked_out": return "slate" as const;
    case "pending": return "amber" as const;
    case "cancelled": return "rose" as const;
    case "no_show": return "rose" as const;
    default: return "slate" as const;
  }
}

function paymentTone(status: string) {
  switch (status) {
    case "fully_paid": return "green" as const;
    case "deposit_paid": return "teal" as const;
    case "refunded": return "amber" as const;
    case "partial_refund": return "amber" as const;
    case "unpaid": return "rose" as const;
    default: return "slate" as const;
  }
}
