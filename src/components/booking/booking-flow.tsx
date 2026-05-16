"use client";

import { BedDouble, CalendarDays, Check, CircleCheck, CreditCard, Languages, MapPin } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, SelectInput, TextArea, TextInput } from "@/components/ui/field";
import { defaultDateRange } from "@/lib/pricing";
import { formatCurrency, formatDate, nightsBetween } from "@/lib/utils";
import type { Locale, PriceBreakdown, Property, RoomType } from "@/types";

type AvailableRoom = RoomType & {
  availableCount: number;
  totalRooms: number;
  price: PriceBreakdown;
};

type CreatedBooking = {
  booking: {
    bookingRef: string;
    checkIn: string;
    checkOut: string;
    totalPrice: number;
    currency: string;
    roomTypeId: string;
    guestCount: number;
    status: string;
    paymentStatus: string;
  };
  guest: {
    email: string;
    firstName: string;
    lastName: string;
    language: Locale;
  };
  roomType: AvailableRoom;
  checkoutUrl: string;
};

export function BookingFlow({ property }: { property: Property }) {
  const dates = useMemo(() => defaultDateRange(), []);
  const [checkIn, setCheckIn] = useState(dates.checkIn);
  const [checkOut, setCheckOut] = useState(dates.checkOut);
  const [guestCount, setGuestCount] = useState(2);
  const [language, setLanguage] = useState<Locale>("en");
  const [rooms, setRooms] = useState<AvailableRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<CreatedBooking | null>(null);
  const [form, setForm] = useState({
    firstName: "Ava",
    lastName: "Nord",
    email: "ava@example.com",
    phone: "+47 400 00 123",
    country: "NO",
    specialRequests: "Late arrival around 20:00.",
  });

  async function searchAvailability() {
    setLoading(true);
    setCreated(null);
    const response = await fetch(
      `/api/properties/${property.slug}/availability?checkIn=${checkIn}&checkOut=${checkOut}`,
    );
    const payload = await response.json();
    const availableRooms = payload.rooms ?? [];
    setRooms(availableRooms);
    setSelectedRoomId(availableRooms[0]?.id ?? "");
    setLoading(false);
  }

  async function createBooking() {
    const response = await fetch(`/api/properties/${property.slug}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomTypeId: selectedRoomId,
        checkIn,
        checkOut,
        guestCount,
        guest: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          country: form.country,
          language,
        },
        specialRequests: form.specialRequests,
      }),
    });
    const payload = (await response.json()) as CreatedBooking;
    setCreated(payload);
    const stored = JSON.parse(localStorage.getItem("fjordview-bookings") ?? "[]");
    localStorage.setItem("fjordview-bookings", JSON.stringify([payload, ...stored]));
  }

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);
  const nights = nightsBetween(checkIn, checkOut);

  return (
    <main className="min-h-screen bg-[#f8faf9]">
      <header className="border-b border-teal-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase text-teal-700">GuestHub prototype</p>
            <h1 className="text-2xl font-semibold text-slate-950">{property.name}</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="h-4 w-4 text-teal-600" />
            {property.city}, {property.country}
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[minmax(0,1.1fr)_420px]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-lg border border-teal-100 bg-white shadow-sm">
            <div className="relative h-72">
              <Image
                src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80"
                alt="Fjordview Lodge"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/75 to-transparent p-6 text-white">
                <h2 className="max-w-xl text-4xl font-semibold tracking-tight">Book a quiet fjord stay</h2>
                <p className="mt-2 max-w-2xl text-sm text-white/85">
                  Compare live demo availability, see nightly pricing rules, and create a test booking without real payment keys.
                </p>
              </div>
            </div>
            <div className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_120px_160px]">
              <div>
                <FieldLabel>Check-in</FieldLabel>
                <TextInput type="date" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} />
              </div>
              <div>
                <FieldLabel>Check-out</FieldLabel>
                <TextInput type="date" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} />
              </div>
              <div>
                <FieldLabel>Guests</FieldLabel>
                <TextInput
                  type="number"
                  min={1}
                  max={6}
                  value={guestCount}
                  onChange={(event) => setGuestCount(Number(event.target.value))}
                />
              </div>
              <div className="flex items-end">
                <Button className="w-full" onClick={searchAvailability} disabled={loading || checkOut <= checkIn}>
                  <CalendarDays className="h-4 w-4" />
                  {loading ? "Checking" : "Search"}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {rooms.length === 0 ? (
              <div className="rounded-lg border border-dashed border-teal-200 bg-white p-8 text-center">
                <BedDouble className="mx-auto h-8 w-8 text-teal-600" />
                <h3 className="mt-3 text-lg font-semibold text-slate-950">Choose dates to see available rooms</h3>
                <p className="mt-1 text-sm text-slate-600">
                  The local demo applies seasonal and weekend pricing from the OPUS prompt.
                </p>
              </div>
            ) : (
              rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`grid overflow-hidden rounded-lg border bg-white text-left shadow-sm transition md:grid-cols-[220px_1fr] ${
                    selectedRoomId === room.id ? "border-teal-500 ring-4 ring-teal-100" : "border-slate-200 hover:border-teal-300"
                  }`}
                >
                  <div className="relative h-48 md:h-full">
                    <Image src={room.photoUrls[0]} alt={room.name[language]} fill className="object-cover" />
                  </div>
                  <div className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-950">{room.name[language]}</h3>
                        <p className="mt-1 text-sm text-slate-600">{room.description[language]}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-slate-950">{formatCurrency(room.price.subtotal)}</div>
                        <div className="text-xs text-slate-500">{nights} nights total</div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge tone="teal">{room.availableCount} available</Badge>
                      <Badge tone={room.hasBathroom ? "green" : "amber"}>
                        {room.hasBathroom ? "Private bath" : "Shared bath"}
                      </Badge>
                      <Badge tone="slate">Up to {room.maxGuests} guests</Badge>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      {room.price.nights.map((night) => (
                        <div key={night.date} className="flex justify-between rounded-md bg-slate-50 px-3 py-2">
                          <span>{formatDate(night.date)}</span>
                          <span className="font-medium text-slate-950">{formatCurrency(night.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <aside className="h-fit rounded-lg border border-teal-100 bg-white p-5 shadow-sm lg:sticky lg:top-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-950">Booking summary</h2>
            <Languages className="h-5 w-5 text-teal-600" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md bg-teal-50 p-3">
              <div className="text-slate-500">Dates</div>
              <div className="font-semibold text-slate-950">{formatDate(checkIn)} - {formatDate(checkOut)}</div>
            </div>
            <div className="rounded-md bg-amber-50 p-3">
              <div className="text-slate-500">Guests</div>
              <div className="font-semibold text-slate-950">{guestCount}</div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div>
              <FieldLabel>Language</FieldLabel>
              <SelectInput value={language} onChange={(event) => setLanguage(event.target.value as Locale)}>
                <option value="en">English</option>
                <option value="no">Norsk</option>
              </SelectInput>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel>First name</FieldLabel>
                <TextInput value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
              </div>
              <div>
                <FieldLabel>Last name</FieldLabel>
                <TextInput value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
              </div>
            </div>
            <div>
              <FieldLabel>Email</FieldLabel>
              <TextInput type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel>Phone</FieldLabel>
                <TextInput value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </div>
              <div>
                <FieldLabel>Country</FieldLabel>
                <TextInput value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} />
              </div>
            </div>
            <div>
              <FieldLabel>Special requests</FieldLabel>
              <TextArea value={form.specialRequests} onChange={(event) => setForm({ ...form, specialRequests: event.target.value })} />
            </div>
          </div>

          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span>{selectedRoom?.name[language] ?? "No room selected"}</span>
              <span className="font-semibold text-slate-950">
                {selectedRoom ? formatCurrency(selectedRoom.price.subtotal) : "-"}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">{property.cancellationInfo[language]}</p>
          </div>

          <Button className="mt-5 w-full" disabled={!selectedRoom} onClick={createBooking}>
            <CreditCard className="h-4 w-4" />
            Pay & confirm demo booking
          </Button>

          {created ? (
            <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 font-semibold text-emerald-800">
                <CircleCheck className="h-5 w-5" />
                Booking confirmed
              </div>
              <p className="mt-1 text-sm text-emerald-700">
                Reference {created.booking.bookingRef}. Local demo payment marked as fully paid.
              </p>
              <a className="mt-3 inline-flex text-sm font-semibold text-teal-700" href={created.checkoutUrl}>
                Open self-service page
              </a>
            </div>
          ) : null}

          <div className="mt-5 flex items-start gap-2 text-xs text-slate-500">
            <Check className="mt-0.5 h-4 w-4 text-teal-600" />
            No real card is charged in local demo mode. Stripe keys can be added later.
          </div>
        </aside>
      </section>
    </main>
  );
}
