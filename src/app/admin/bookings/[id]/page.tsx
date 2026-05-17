import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Mail, Phone, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getCurrentAdminContext } from "@/lib/admin-context";
import { getBookingDetailForProperty } from "@/lib/db/queries";
import {
  bookingStatusTone,
  formatCurrency,
  formatDate,
  humanizeEnum,
  nightsBetween,
  paymentStatusTone,
} from "@/lib/utils";
import { CancelBookingButton } from "./cancel-button";

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getCurrentAdminContext();
  if (!context) notFound();
  const data = await getBookingDetailForProperty(context.property.id, id);
  if (!data) notFound();
  const { property, booking, guest, roomType, room } = data;

  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  const created = booking.createdAt ? new Date(booking.createdAt) : null;

  return (
    <main className="space-y-5 p-5">
      <Link href="/admin/bookings" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-teal-700">
        <ArrowLeft className="h-4 w-4" /> Back to bookings
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-950">{booking.bookingRef}</h1>
          <p className="mt-1 text-slate-500">
            {property.name}{created ? ` · Created ${formatDate(created)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={bookingStatusTone(booking.status)}>{humanizeEnum(booking.status)}</Badge>
          <Badge tone={paymentStatusTone(booking.paymentStatus)}>{humanizeEnum(booking.paymentStatus)}</Badge>
          <Badge tone="slate">source: {booking.source}</Badge>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-xl font-semibold text-slate-950">Stay</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Check-in">{formatDate(booking.checkIn)} · from {property.checkInTime}</Field>
            <Field label="Check-out">{formatDate(booking.checkOut)} · by {property.checkOutTime}</Field>
            <Field label="Nights">{nights}</Field>
            <Field label="Guest count">{booking.guestCount}</Field>
            <Field label="Room type">{roomType.name.en}</Field>
            <Field label="Room number">{room ? room.roomNumber : "Unassigned"}</Field>
            <Field label="Total">{formatCurrency(booking.totalPrice, booking.currency)}</Field>
            <Field label="Paid">{formatCurrency(booking.paidAmount ?? 0, booking.currency)}</Field>
            {booking.specialRequests ? (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Special requests</dt>
                <dd className="mt-1 rounded-md bg-slate-50 p-3 text-sm text-slate-700">{booking.specialRequests}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Guest</h2>
          <Link
            href={`/admin/guests/${guest.id}`}
            className="mt-4 inline-block text-base font-semibold text-teal-700 hover:underline"
          >
            {guest.firstName} {guest.lastName}
          </Link>
          <div className="mt-2 space-y-1 text-sm text-slate-600">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {guest.email}</div>
            {guest.phone ? <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {guest.phone}</div> : null}
            {guest.country ? <div>{guest.country}</div> : null}
            <div>Language: {guest.language.toUpperCase()}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-slate-50 p-2"><div className="text-slate-500">Total bookings</div><div className="font-semibold">{guest.totalBookings}</div></div>
            <div className="rounded-md bg-slate-50 p-2"><div className="text-slate-500">Total spent</div><div className="font-semibold">{formatCurrency(guest.totalSpent)}</div></div>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">Actions</h2>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/invoices/${booking.id}`}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Receipt className="h-4 w-4" /> View invoice
          </Link>
          <Link
            href={`/api/admin/invoices/${booking.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <FileText className="h-4 w-4" /> Raw JSON
          </Link>
          {!["cancelled", "no_show"].includes(booking.status) ? (
            <CancelBookingButton bookingRef={booking.bookingRef} email={guest.email} />
          ) : null}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Cancel goes through the standard self-service cancellation flow — enforces the default policy, frees the room, marks payment refunded if applicable.
        </p>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-950">{children}</dd>
    </div>
  );
}

