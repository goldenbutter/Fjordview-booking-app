"use client";

import { CircleCheck, Mail, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, TextArea, TextInput } from "@/components/ui/field";
import { demoBookings, demoGuests, demoRoomTypes } from "@/lib/db/seed";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Property } from "@/types";

type StoredBooking = {
  booking: {
    bookingRef: string;
    checkIn: string;
    checkOut: string;
    totalPrice: number;
    currency: string;
    status: string;
    paymentStatus: string;
    roomTypeId: string;
  };
  guest: {
    email: string;
    firstName: string;
    lastName: string;
  };
  roomType?: {
    name: { no: string; en: string };
  };
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
  const [cancelled, setCancelled] = useState(false);
  const [reason, setReason] = useState("");

  const bookingData = useMemo<StoredBooking | null>(() => {
    if (typeof window !== "undefined") {
      const stored = JSON.parse(localStorage.getItem("fjordview-bookings") ?? "[]") as StoredBooking[];
      const match = stored.find((item) => item.booking.bookingRef === bookingRef);
      if (match) return match;
    }

    const booking = demoBookings.find((item) => item.bookingRef === bookingRef);
    const guest = booking ? demoGuests.find((item) => item.id === booking.guestId) : undefined;
    const roomType = booking ? demoRoomTypes.find((item) => item.id === booking.roomTypeId) : undefined;
    if (!booking || !guest) return null;
    return { booking, guest, roomType };
  }, [bookingRef]);

  const emailMatches = bookingData && email.toLowerCase() === bookingData.guest.email.toLowerCase();

  return (
    <main className="min-h-screen bg-[#f8faf9] px-5 py-8">
      <section className="mx-auto max-w-3xl rounded-lg border border-teal-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-teal-700">{property.name}</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-950">Booking {bookingRef}</h1>
          </div>
          {success ? <Badge tone="green">Payment demo complete</Badge> : <Badge tone="slate">Self-service</Badge>}
        </div>

        <div className="mt-6">
          <FieldLabel>Confirm guest email</FieldLabel>
          <div className="mt-1 flex gap-2">
            <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <Button variant="secondary">
              <Mail className="h-4 w-4" />
              Verify
            </Button>
          </div>
        </div>

        {!bookingData ? (
          <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            This reference is not in the seed data. If you just created it, open this page from the same browser session.
          </div>
        ) : !emailMatches ? (
          <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Enter the booking email to view details.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md bg-teal-50 p-4">
                <div className="text-xs uppercase text-slate-500">Guest</div>
                <div className="font-semibold text-slate-950">
                  {bookingData.guest.firstName} {bookingData.guest.lastName}
                </div>
              </div>
              <div className="rounded-md bg-slate-50 p-4">
                <div className="text-xs uppercase text-slate-500">Stay</div>
                <div className="font-semibold text-slate-950">
                  {formatDate(bookingData.booking.checkIn)} - {formatDate(bookingData.booking.checkOut)}
                </div>
              </div>
              <div className="rounded-md bg-amber-50 p-4">
                <div className="text-xs uppercase text-slate-500">Total paid</div>
                <div className="font-semibold text-slate-950">
                  {formatCurrency(bookingData.booking.totalPrice, bookingData.booking.currency)}
                </div>
              </div>
            </div>

            <div className="rounded-md border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-slate-500">Room type</div>
                  <div className="text-lg font-semibold text-slate-950">
                    {bookingData.roomType?.name.en ?? "Selected room"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge tone={cancelled ? "rose" : "teal"}>
                    {cancelled ? "cancelled" : bookingData.booking.status}
                  </Badge>
                  <Badge tone="green">{cancelled ? "refunded" : bookingData.booking.paymentStatus}</Badge>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Check-in from {property.checkInTime}. Check-out by {property.checkOutTime}. Contact {property.contactEmail}.
              </p>
            </div>

            {!cancelled ? (
              <div className="rounded-md border border-slate-200 p-4">
                <h2 className="font-semibold text-slate-950">Cancellation</h2>
                <p className="mt-1 text-sm text-slate-600">{property.cancellationInfo.en}</p>
                <div className="mt-3">
                  <FieldLabel>Reason</FieldLabel>
                  <TextArea value={reason} onChange={(event) => setReason(event.target.value)} />
                </div>
                <Button className="mt-3" variant="danger" onClick={() => setCancelled(true)}>
                  <RotateCcw className="h-4 w-4" />
                  Cancel demo booking
                </Button>
              </div>
            ) : (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                <div className="flex items-center gap-2 font-semibold">
                  <CircleCheck className="h-5 w-5" />
                  Booking cancelled locally
                </div>
                <p className="mt-1 text-sm">A real integration would create the Stripe refund and send a cancellation email.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
