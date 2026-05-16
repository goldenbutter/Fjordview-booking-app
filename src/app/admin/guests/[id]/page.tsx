import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getGuestById, getPropertyBySlug } from "@/lib/db/queries";
import { env } from "@/lib/env";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function GuestProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await getPropertyBySlug(env.defaultPropertySlug);
  if (!property) notFound();
  const result = await getGuestById(property.id, id);
  if (!result) notFound();
  const { guest, bookings } = result;

  return (
    <main className="space-y-5 p-5">
      <Link href="/admin/guests" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-teal-700">
        <ArrowLeft className="h-4 w-4" /> Back to guests
      </Link>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-slate-950">{guest.firstName} {guest.lastName}</h1>
            <div className="mt-2 space-y-1 text-sm text-slate-600">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {guest.email}</div>
              {guest.phone ? <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {guest.phone}</div> : null}
              {guest.country ? <div>{guest.country}</div> : null}
            </div>
          </div>
          <Badge tone="teal">{guest.language.toUpperCase()}</Badge>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Total bookings</div>
            <div className="font-semibold">{guest.totalBookings}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Total spent</div>
            <div className="font-semibold">{formatCurrency(guest.totalSpent)}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Bookings shown</div>
            <div className="font-semibold">{bookings.length}</div>
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Booking history</h2>
        {bookings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No bookings for this guest yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Stay</th>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-teal-700">
                      <Link href={`/admin/bookings/${booking.id}`} className="hover:underline">{booking.bookingRef}</Link>
                    </td>
                    <td className="px-4 py-3">{formatDate(booking.checkIn)} – {formatDate(booking.checkOut)}</td>
                    <td className="px-4 py-3">{booking.roomLabel}</td>
                    <td className="px-4 py-3">{booking.status.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCurrency(booking.totalPrice, booking.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
