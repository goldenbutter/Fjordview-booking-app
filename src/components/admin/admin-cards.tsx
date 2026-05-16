import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { AdminBookingRow, AdminCleaningRow } from "@/lib/db/queries";
import {
  bookingStatusTone,
  formatCurrency,
  formatDate,
  humanizeEnum,
  paymentStatusTone,
} from "@/lib/utils";
import type { Booking, Room, RoomType } from "@/types";

export function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{detail}</div>
    </div>
  );
}

export function BookingTable({ bookings }: { bookings: AdminBookingRow[] }) {
  return (
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
              <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                No bookings yet.
              </td>
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
                  <Badge tone={bookingStatusTone(booking.status)}>{humanizeEnum(booking.status)}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={paymentStatusTone(booking.paymentStatus)}>{humanizeEnum(booking.paymentStatus)}</Badge>
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCurrency(booking.totalPrice, booking.currency)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function RoomInventory({ rooms, roomTypes }: { rooms: Room[]; roomTypes: RoomType[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {roomTypes.map((type) => {
        const count = rooms.filter((room) => room.roomTypeId === type.id).length;
        return (
          <div key={type.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-lg font-semibold text-slate-950">{type.name.en}</div>
            <p className="mt-1 text-sm text-slate-500">{type.description.en}</p>
            <div className="mt-4 flex items-center justify-between">
              <Badge tone="teal">{count} rooms</Badge>
              <span className="font-semibold">{formatCurrency(type.basePrice)}/night</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CleaningList({ tasks }: { tasks: AdminCleaningRow[] }) {
  return (
    <div className="grid gap-3">
      {tasks.map((task) => (
        <div key={task.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <div className="font-semibold text-slate-950">Room {task.roomLabel}</div>
            <div className="text-sm text-slate-500">{formatDate(task.taskDate)} · Assigned to {task.assignedTo ?? "Unassigned"}</div>
          </div>
          <Badge tone={task.status === "completed" ? "green" : task.status === "in_progress" ? "teal" : "amber"}>{humanizeEnum(task.status)}</Badge>
        </div>
      ))}
    </div>
  );
}

function calendarBlockTone(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-teal-100 text-teal-900 ring-1 ring-teal-200";
    case "checked_in":
      return "bg-emerald-200 text-emerald-900 ring-1 ring-emerald-300";
    case "checked_out":
      return "bg-slate-200 text-slate-800 ring-1 ring-slate-300";
    case "pending":
      return "bg-amber-100 text-amber-900 ring-1 ring-amber-200";
    default:
      return "bg-slate-100 text-slate-800 ring-1 ring-slate-200";
  }
}

export function CalendarLegend() {
  const items = [
    { label: "Confirmed", tone: "bg-teal-100 ring-teal-200" },
    { label: "Checked in", tone: "bg-emerald-200 ring-emerald-300" },
    { label: "Checked out", tone: "bg-slate-200 ring-slate-300" },
    { label: "Pending", tone: "bg-amber-100 ring-amber-200" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-2">
          <span className={`inline-block h-3 w-5 rounded-sm ring-1 ${item.tone}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function CalendarGrid({
  bookings,
  rooms,
  start,
  days: dayCount = 14,
}: {
  bookings: Booking[];
  rooms: Room[];
  start?: string;
  days?: number;
}) {
  const startDate = start ? new Date(`${start}T00:00:00Z`) : new Date();
  if (!start) startDate.setHours(0, 0, 0, 0);

  const days = Array.from({ length: dayCount }, (_, i) => {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const label = `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    return { iso, label };
  });
  const visibleBookings = bookings.filter((booking) => !["cancelled", "no_show"].includes(booking.status));

  return (
    <div className="overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="grid min-w-[1100px]" style={{ gridTemplateColumns: `150px repeat(${days.length}, minmax(80px, 1fr))` }}>
        <div className="border-b border-slate-100 bg-slate-50 p-3 text-xs font-semibold uppercase text-slate-500">Room</div>
        {days.map((day) => (
          <div key={day.iso} className="border-b border-l border-slate-100 bg-slate-50 p-3 text-xs font-semibold uppercase text-slate-500">{day.label}</div>
        ))}
        {rooms.map((room) => (
          <div key={room.id} className="contents">
            <div key={`${room.id}-label`} className="border-b border-slate-100 p-3 text-sm font-semibold">Room {room.roomNumber}</div>
            {days.map((day) => {
              const booking = visibleBookings.find(
                (item) => item.roomId === room.id && item.checkIn <= day.iso && item.checkOut > day.iso,
              );
              return (
                <div key={`${room.id}-${day.iso}`} className="min-h-16 border-b border-l border-slate-100 p-2">
                  {booking ? (
                    <a
                      href={`/admin/bookings/${booking.id}`}
                      className={`block rounded-md px-2 py-1 text-xs font-semibold leading-5 transition hover:opacity-90 ${calendarBlockTone(booking.status)}`}
                      title={`${booking.bookingRef} (${booking.status})`}
                    >
                      {booking.bookingRef}
                    </a>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
