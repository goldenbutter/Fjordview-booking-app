import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, FileJson } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getCurrentAdminContext } from "@/lib/admin-context";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { getBookingDetailForProperty } from "@/lib/db/queries";
import { calculateStayPrice } from "@/lib/pricing";
import { formatCurrency, formatDate, humanizeEnum, nightsBetween } from "@/lib/utils";
import { PrintButton } from "./print-button";

// Norwegian accommodation VAT (MVA): 12%
const VAT_RATE = 0.12;

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;

  const context = await getCurrentAdminContext();
  if (!context) notFound();
  const data = await getBookingDetailForProperty(context.property.id, bookingId);
  if (!data) notFound();
  const { property, booking, guest, roomType, room } = data;

  const db = getDb();
  const pricingRuleRows = await db
    .select()
    .from(schema.pricingRules)
    .where(eq(schema.pricingRules.propertyId, property.id));
  const breakdown = calculateStayPrice(
    roomType.basePrice,
    booking.checkIn,
    booking.checkOut,
    pricingRuleRows.map((row) => ({
      id: row.id,
      propertyId: row.propertyId,
      roomTypeId: row.roomTypeId ?? undefined,
      name: row.name,
      ruleType: row.ruleType as "seasonal" | "day_of_week" | "special",
      priceOverride: row.priceOverride ?? undefined,
      modifierPct: row.modifierPct ?? undefined,
      startDate: row.startDate ?? undefined,
      endDate: row.endDate ?? undefined,
      daysOfWeek: row.daysOfWeek ?? undefined,
      priority: row.priority ?? 0,
      active: row.active ?? true,
    })),
    booking.currency,
  );

  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  const subtotalExVat = Math.round(booking.totalPrice / (1 + VAT_RATE));
  const vat = booking.totalPrice - subtotalExVat;

  const issuedDate = booking.createdAt ? new Date(booking.createdAt) : new Date();
  const issuedLabel = `${String(issuedDate.getDate()).padStart(2, "0")}.${String(issuedDate.getMonth() + 1).padStart(2, "0")}.${issuedDate.getFullYear()}`;

  return (
    <main className="bg-slate-100 px-5 py-8 print:bg-white print:p-0">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 pb-4 print:hidden">
        <Link
          href="/admin/invoices"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-teal-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to invoices
        </Link>
        <div className="flex gap-2">
          <Link
            href={`/api/admin/invoices/${booking.id}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <FileJson className="h-4 w-4" /> JSON
          </Link>
          <PrintButton />
        </div>
      </div>

      <article className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-10 shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">{property.name}</h1>
            <p className="mt-1 text-sm text-slate-600">{property.address}, {property.postalCode} {property.city}, {property.country}</p>
            <p className="text-sm text-slate-600">{property.contactEmail} · {property.contactPhone}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Invoice</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{booking.bookingRef}</p>
            <p className="mt-2 text-sm text-slate-500">Issued {issuedLabel}</p>
          </div>
        </header>

        <section className="grid gap-6 py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Billed to</p>
            <p className="mt-1 text-base font-semibold text-slate-950">{guest.firstName} {guest.lastName}</p>
            <p className="text-sm text-slate-600">{guest.email}</p>
            {guest.phone ? <p className="text-sm text-slate-600">{guest.phone}</p> : null}
            {guest.country ? <p className="text-sm text-slate-600">{guest.country}</p> : null}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Stay</p>
            <p className="mt-1 text-base font-semibold text-slate-950">
              {formatDate(booking.checkIn)} – {formatDate(booking.checkOut)}
            </p>
            <p className="text-sm text-slate-600">
              {nights} night{nights === 1 ? "" : "s"} · {booking.guestCount} guest{booking.guestCount === 1 ? "" : "s"}
            </p>
            <p className="text-sm text-slate-600">
              {roomType.name.en}{room ? ` · Room ${room.roomNumber}` : ""}
            </p>
          </div>
        </section>

        <section>
          <table className="w-full text-left text-sm">
            <thead className="border-y border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-2 py-3">Date</th>
                <th className="px-2 py-3">Description</th>
                <th className="px-2 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {breakdown.nights.map((night) => (
                <tr key={night.date}>
                  <td className="px-2 py-3 text-slate-700">{formatDate(night.date)}</td>
                  <td className="px-2 py-3 text-slate-700">
                    {roomType.name.en}
                    {night.appliedRule ? <span className="ml-2 text-xs text-slate-500">({night.appliedRule})</span> : null}
                  </td>
                  <td className="px-2 py-3 text-right font-medium tabular-nums text-slate-950">
                    {formatCurrency(night.price, booking.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-200">
              <tr>
                <td className="px-2 pt-4 text-xs uppercase tracking-wider text-slate-500" colSpan={2}>Subtotal (ex. VAT)</td>
                <td className="px-2 pt-4 text-right text-slate-700 tabular-nums">{formatCurrency(subtotalExVat, booking.currency)}</td>
              </tr>
              <tr>
                <td className="px-2 py-1 text-xs uppercase tracking-wider text-slate-500" colSpan={2}>VAT (MVA) 12%</td>
                <td className="px-2 py-1 text-right text-slate-700 tabular-nums">{formatCurrency(vat, booking.currency)}</td>
              </tr>
              <tr>
                <td className="px-2 pt-3 text-base font-semibold text-slate-950" colSpan={2}>Total</td>
                <td className="px-2 pt-3 text-right text-base font-semibold tabular-nums text-slate-950">
                  {formatCurrency(booking.totalPrice, booking.currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-md bg-slate-50 p-4 print:bg-transparent print:border print:border-slate-300">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Payment status</p>
            <p className="mt-1 text-base font-semibold text-slate-950">{humanizeEnum(booking.paymentStatus)}</p>
          </div>
          <Badge tone={booking.paymentStatus === "fully_paid" ? "green" : booking.paymentStatus === "refunded" ? "amber" : "slate"}>
            {formatCurrency(booking.paidAmount ?? 0, booking.currency)} paid
          </Badge>
        </section>

        <footer className="mt-8 border-t border-slate-200 pt-6 text-xs text-slate-500">
          <p className="font-semibold text-slate-700">Cancellation</p>
          <p className="mt-1">{property.cancellationInfo.en}</p>
          <p className="mt-4">
            Thank you for staying at {property.name}. Questions? Contact {property.contactEmail}.
          </p>
        </footer>
      </article>
    </main>
  );
}
