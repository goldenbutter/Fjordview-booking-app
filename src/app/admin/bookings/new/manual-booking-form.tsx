"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel, SelectInput, TextArea, TextInput } from "@/components/ui/field";
import { formatCurrency } from "@/lib/utils";
import type { Locale, RoomType } from "@/types";

type Props = {
  roomTypes: RoomType[];
  defaultCheckIn: string;
  defaultCheckOut: string;
};

export function ManualBookingForm({ roomTypes, defaultCheckIn, defaultCheckOut }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    roomTypeId: roomTypes[0]?.id ?? "",
    checkIn: defaultCheckIn,
    checkOut: defaultCheckOut,
    guestCount: 2,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "NO",
    language: "en" as Locale,
    specialRequests: "",
    paymentStatus: "fully_paid" as "unpaid" | "deposit_paid" | "fully_paid",
    totalPriceOverride: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedRoomType = roomTypes.find((rt) => rt.id === form.roomTypeId);
  const estimatedSubtotal = selectedRoomType
    ? selectedRoomType.basePrice * Math.max(0, nightsBetween(form.checkIn, form.checkOut))
    : 0;

  async function submit() {
    if (!form.firstName || !form.lastName || !form.email) {
      setError("Guest first name, last name, and email are required.");
      return;
    }
    if (form.checkOut <= form.checkIn) {
      setError("Check-out must be after check-in.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const overrideOre = form.totalPriceOverride
        ? Math.round(parseFloat(form.totalPriceOverride.replace(",", ".")) * 100)
        : undefined;
      const paidAmount =
        form.paymentStatus === "fully_paid"
          ? overrideOre ?? estimatedSubtotal
          : form.paymentStatus === "deposit_paid"
          ? Math.round((overrideOre ?? estimatedSubtotal) / 2)
          : 0;

      const response = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomTypeId: form.roomTypeId,
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          guestCount: Number(form.guestCount),
          guest: {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone || undefined,
            country: form.country || undefined,
            language: form.language,
          },
          specialRequests: form.specialRequests || undefined,
          totalPriceOverride: overrideOre,
          paymentStatus: form.paymentStatus,
          paidAmount,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Could not create booking");
        return;
      }
      router.push("/admin/bookings");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Stay</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_120px]">
          <div>
            <FieldLabel>Check-in</FieldLabel>
            <TextInput
              type="date"
              value={form.checkIn}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(event) => {
                const next = event.target.value;
                setForm((f) => ({
                  ...f,
                  checkIn: next,
                  checkOut: f.checkOut <= next ? addDay(next) : f.checkOut,
                }));
              }}
            />
          </div>
          <div>
            <FieldLabel>Check-out</FieldLabel>
            <TextInput
              type="date"
              value={form.checkOut}
              min={form.checkIn}
              onChange={(event) => setForm({ ...form, checkOut: event.target.value })}
            />
          </div>
          <div>
            <FieldLabel>Guests</FieldLabel>
            <TextInput
              type="number"
              min={1}
              max={selectedRoomType?.maxGuests ?? 6}
              value={form.guestCount}
              onChange={(event) => setForm({ ...form, guestCount: Number(event.target.value) })}
            />
          </div>
        </div>
        <div className="mt-3">
          <FieldLabel>Room type</FieldLabel>
          <SelectInput
            value={form.roomTypeId}
            onChange={(event) => setForm({ ...form, roomTypeId: event.target.value })}
          >
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name.en} — {formatCurrency(rt.basePrice)} / night
              </option>
            ))}
          </SelectInput>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Guest</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>First name</FieldLabel>
            <TextInput value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          </div>
          <div>
            <FieldLabel>Last name</FieldLabel>
            <TextInput value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          </div>
          <div>
            <FieldLabel>Email</FieldLabel>
            <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <FieldLabel>Phone</FieldLabel>
            <TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <FieldLabel>Country</FieldLabel>
            <TextInput value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>
          <div>
            <FieldLabel>Language</FieldLabel>
            <SelectInput value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value as Locale })}>
              <option value="en">English</option>
              <option value="no">Norsk</option>
            </SelectInput>
          </div>
        </div>
        <div className="mt-3">
          <FieldLabel>Special requests</FieldLabel>
          <TextArea value={form.specialRequests} onChange={(e) => setForm({ ...form, specialRequests: e.target.value })} />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Payment</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Payment status</FieldLabel>
            <SelectInput
              value={form.paymentStatus}
              onChange={(e) => setForm({ ...form, paymentStatus: e.target.value as typeof form.paymentStatus })}
            >
              <option value="fully_paid">Fully paid (e.g. cash at reception)</option>
              <option value="deposit_paid">Deposit paid</option>
              <option value="unpaid">Unpaid (collect later)</option>
            </SelectInput>
          </div>
          <div>
            <FieldLabel>Total override (NOK, optional)</FieldLabel>
            <TextInput
              placeholder={`Estimated: ${formatCurrency(estimatedSubtotal)}`}
              value={form.totalPriceOverride}
              onChange={(e) => setForm({ ...form, totalPriceOverride: e.target.value })}
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Leaves blank = use estimated subtotal {selectedRoomType ? `(${formatCurrency(estimatedSubtotal)})` : ""}. Useful for negotiated discounts at reception.
        </p>
      </section>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/bookings")}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {loading ? "Saving" : "Save booking"}
        </Button>
      </div>
    </form>
  );
}

function nightsBetween(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0;
  const a = new Date(`${checkIn}T00:00:00Z`).getTime();
  const b = new Date(`${checkOut}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

function addDay(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
