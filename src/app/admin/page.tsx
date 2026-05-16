import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { BookingTable, StatCard } from "@/components/admin/admin-cards";
import { getAdminSnapshot } from "@/lib/admin-metrics";
import type { AdminBookingRow } from "@/lib/db/queries";
import {
  bookingStatusTone,
  formatCurrency,
  formatDate,
  humanizeEnum,
  paymentStatusTone,
} from "@/lib/utils";

export default async function AdminDashboardPage() {
  const snapshot = await getAdminSnapshot();

  if (!snapshot) {
    return (
      <main className="space-y-6 p-5">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-rose-700">Property not found. Run <code>npm run seed</code> against your Supabase project.</p>
      </main>
    );
  }

  const recent = snapshot.recentBookings.slice(0, 5);

  return (
    <main className="space-y-6 p-5">
      <div>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-slate-500">Today&apos;s operating view for {snapshot.property.name}.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Occupancy" value={`${snapshot.occupancyPct}%`} detail={`${snapshot.occupiedRooms}/${snapshot.totalRooms} rooms occupied`} />
        <StatCard label="Revenue" value={formatCurrency(snapshot.revenue)} detail="All paid bookings" />
        <StatCard label="Arrivals today" value={String(snapshot.arrivals.length)} detail="Guests checking in" />
        <StatCard label="Departures today" value={String(snapshot.departures.length)} detail="Guests checking out" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <ArrivalsCard title="Today's arrivals" rows={snapshot.arrivals} emptyLabel="No arrivals scheduled for today." />
        <DeparturesCard title="Today's departures" rows={snapshot.departures} emptyLabel="No departures scheduled for today." />
      </div>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Last 5 bookings</h2>
        <BookingTable bookings={recent} />
      </section>
    </main>
  );
}

function ArrivalsCard({ title, rows, emptyLabel }: { title: string; rows: AdminBookingRow[]; emptyLabel: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <div>
                <Link href={`/admin/bookings/${row.id}`} className="font-semibold text-teal-700 hover:underline">
                  {row.guestName}
                </Link>
                <div className="text-xs text-slate-500">
                  {row.bookingRef} · Room {row.roomLabel} · {formatDate(row.checkOut)} departure
                </div>
              </div>
              <Badge tone={paymentStatusTone(row.paymentStatus)}>{humanizeEnum(row.paymentStatus)}</Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DeparturesCard({ title, rows, emptyLabel }: { title: string; rows: AdminBookingRow[]; emptyLabel: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <div>
                <Link href={`/admin/bookings/${row.id}`} className="font-semibold text-teal-700 hover:underline">
                  {row.guestName}
                </Link>
                <div className="text-xs text-slate-500">
                  {row.bookingRef} · Room {row.roomLabel} · checked in {formatDate(row.checkIn)}
                </div>
              </div>
              <Badge tone={bookingStatusTone(row.status)}>{humanizeEnum(row.status)}</Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
