import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarGrid, CalendarLegend } from "@/components/admin/admin-cards";
import { getCurrentAdminContext } from "@/lib/admin-context";
import { getCalendarData } from "@/lib/db/queries";

const WINDOW_DAYS = 14;

function todayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function shiftIso(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isValidIso(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatRangeLabel(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() - 1);
  const fmt = (d: Date) =>
    `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${d.getUTCFullYear()}`;
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const query = await searchParams;
  const start = isValidIso(query.start) ? query.start : todayIso();
  const end = shiftIso(start, WINDOW_DAYS);

  const context = await getCurrentAdminContext();
  const property = context?.property;
  if (!property) {
    return (
      <main className="space-y-5 p-5">
        <h1 className="text-3xl font-semibold">Calendar</h1>
        <p className="mt-1 text-rose-700">Property not found.</p>
      </main>
    );
  }

  const { rooms, bookings } = await getCalendarData(property.id, start, end);

  const prevStart = shiftIso(start, -WINDOW_DAYS);
  const nextStart = shiftIso(start, WINDOW_DAYS);
  const today = todayIso();

  return (
    <main className="space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Calendar</h1>
          <p className="mt-1 text-slate-500">Two-week room occupancy grid · {formatRangeLabel(start, end)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/calendar?start=${prevStart}`}
            className="inline-flex h-10 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Link>
          <Link
            href={`/admin/calendar?start=${today}`}
            className="inline-flex h-10 items-center justify-center rounded-md border border-teal-200 bg-teal-50 px-3 text-sm font-semibold text-teal-700 hover:bg-teal-100"
          >
            Today
          </Link>
          <Link
            href={`/admin/calendar?start=${nextStart}`}
            className="inline-flex h-10 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Link>
          <form action="/admin/calendar" className="flex items-center gap-2">
            <label htmlFor="cal-start" className="text-sm text-slate-500">Jump to</label>
            <input
              id="cal-start"
              type="date"
              name="start"
              defaultValue={start}
              className="h-10 rounded-md border border-slate-200 bg-white px-2 text-sm"
            />
            <button type="submit" className="h-10 rounded-md bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-700">
              Go
            </button>
          </form>
        </div>
      </div>
      <CalendarLegend />
      <CalendarGrid bookings={bookings} rooms={rooms} start={start} days={WINDOW_DAYS} />
    </main>
  );
}
