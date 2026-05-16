"use client";

import { CircleCheck, Loader2, Mail, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, TextArea, TextInput } from "@/components/ui/field";
import {
  bookingStatusTone,
  formatCurrency,
  formatDate,
  humanizeEnum,
  paymentStatusTone,
} from "@/lib/utils";
import type { Booking, Guest, Locale, Property, Room, RoomType } from "@/types";

type LoadedBooking = {
  property: Property;
  booking: Booking;
  guest: Guest;
  roomType: RoomType;
  room: Room | null;
};

type CancelResult = {
  booking: Booking;
  refundAmount: number;
};

export function BookingSelfService({
  bookingRef,
  property,
  initialEmail,
  success,
}: {
  bookingRef: string;
  property: Property;
  initialEmail?: string;
  success: boolean;
}) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [data, setData] = useState<LoadedBooking | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [cancelled, setCancelled] = useState<CancelResult | null>(null);

  async function loadBooking() {
    if (!email) {
      setError("Enter the booking email to view details.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const url = `/api/bookings/${encodeURIComponent(bookingRef)}?email=${encodeURIComponent(email)}`;
      const response = await fetch(url);
      const payload = await response.json();
      if (!response.ok) {
        setData(null);
        setError(typeof payload.error === "string" ? payload.error : "Could not load booking");
      } else {
        setData(payload);
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function cancelBooking() {
    if (!data) return;
    setCancelling(true);
    setError("");
    try {
      const response = await fetch(`/api/bookings/${encodeURIComponent(bookingRef)}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, reason }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Could not cancel booking");
      } else {
        setCancelled({ booking: payload.booking, refundAmount: payload.refundAmount });
        setData({ ...data, booking: payload.booking });
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setCancelling(false);
    }
  }

  const language: Locale = data?.booking.language ?? "en";

  return (
    <main className="min-h-screen bg-[#f8faf9] px-5 py-8">
      <section className="mx-auto max-w-3xl rounded-lg border border-teal-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-teal-700">{property.name}</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-950">Booking {bookingRef}</h1>
          </div>
          {success ? <Badge tone="green">Payment confirmed</Badge> : <Badge tone="slate">Self-service</Badge>}
        </div>

        <div className="mt-6">
          <FieldLabel>Confirm guest email</FieldLabel>
          <div className="mt-1 flex gap-2">
            <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <Button variant="secondary" onClick={loadBooking} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {loading ? "Loading" : "Verify"}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        {!data && !error ? (
          <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Enter the booking email and click Verify to view details.
          </div>
        ) : null}

        {data ? (
          <div className="mt-6 space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md bg-teal-50 p-4">
                <div className="text-xs uppercase text-slate-500">Guest</div>
                <div className="font-semibold text-slate-950">
                  {data.guest.firstName} {data.guest.lastName}
                </div>
              </div>
              <div className="rounded-md bg-slate-50 p-4">
                <div className="text-xs uppercase text-slate-500">Stay</div>
                <div className="font-semibold text-slate-950">
                  {formatDate(data.booking.checkIn)} - {formatDate(data.booking.checkOut)}
                </div>
              </div>
              <div className="rounded-md bg-amber-50 p-4">
                <div className="text-xs uppercase text-slate-500">Total paid</div>
                <div className="font-semibold text-slate-950">
                  {formatCurrency(data.booking.paidAmount ?? data.booking.totalPrice, data.booking.currency)}
                </div>
              </div>
            </div>

            <div className="rounded-md border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-slate-500">Room type</div>
                  <div className="text-lg font-semibold text-slate-950">
                    {data.roomType.name[language] ?? data.roomType.name.en}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge tone={bookingStatusTone(data.booking.status)}>
                    {humanizeEnum(data.booking.status)}
                  </Badge>
                  <Badge tone={paymentStatusTone(data.booking.paymentStatus)}>
                    {humanizeEnum(data.booking.paymentStatus)}
                  </Badge>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Check-in from {property.checkInTime}. Check-out by {property.checkOutTime}. Contact {property.contactEmail}.
              </p>
            </div>

            {!cancelled && data.booking.status !== "cancelled" ? (
              <div className="rounded-md border border-slate-200 p-4">
                <h2 className="font-semibold text-slate-950">Cancellation</h2>
                <p className="mt-1 text-sm text-slate-600">{property.cancellationInfo[language] ?? property.cancellationInfo.en}</p>
                <div className="mt-3">
                  <FieldLabel>Reason</FieldLabel>
                  <TextArea value={reason} onChange={(event) => setReason(event.target.value)} />
                </div>
                <Button className="mt-3" variant="danger" onClick={cancelBooking} disabled={cancelling}>
                  {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  {cancelling ? "Cancelling" : "Cancel booking"}
                </Button>
              </div>
            ) : (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                <div className="flex items-center gap-2 font-semibold">
                  <CircleCheck className="h-5 w-5" />
                  Booking cancelled
                </div>
                {cancelled ? (
                  <p className="mt-1 text-sm">
                    Refund amount: {formatCurrency(cancelled.refundAmount, data.booking.currency)}. A real Stripe refund will be issued when payment integration is wired.
                  </p>
                ) : (
                  <p className="mt-1 text-sm">This booking is already cancelled.</p>
                )}
              </div>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}
