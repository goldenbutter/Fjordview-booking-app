"use client";

import {
  Bath,
  BedDouble,
  CalendarDays,
  Check,
  CircleCheck,
  Coffee,
  CreditCard,
  Languages,
  MapPin,
  Mountain,
  ParkingSquare,
  ShowerHead,
  Sparkles,
  Wifi,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
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

type DisplayRoom = RoomType & {
  availableCount?: number;
  totalRooms?: number;
  price?: PriceBreakdown;
};

type CreatedBooking = {
  mode: "stripe" | "local-demo";
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

const HIGHLIGHTS = [
  {
    icon: Wifi,
    title: { no: "Rask Wi-Fi", en: "Fast Wi-Fi" },
    body: {
      no: "Fiberbredbånd i alle rom og fellesarealer.",
      en: "Fibre broadband in every room and common area.",
    },
  },
  {
    icon: Coffee,
    title: { no: "Frokost inkludert", en: "Breakfast included" },
    body: {
      no: "Lokalt brød, ost og kaffe servert 07:30–10:00.",
      en: "Local bread, cheese, and coffee served 07:30–10:00.",
    },
  },
  {
    icon: ParkingSquare,
    title: { no: "Gratis parkering", en: "Free parking" },
    body: {
      no: "Bilplass ved hovedinngangen, ingen reservasjon nødvendig.",
      en: "Parking at the main entrance, no reservation required.",
    },
  },
  {
    icon: Mountain,
    title: { no: "Fjordutsikt", en: "Fjord view" },
    body: {
      no: "Felles solterrasse vendt mot vannet og fjellene.",
      en: "Shared sun terrace facing the water and the mountains.",
    },
  },
] as const;

export function BookingFlow({ property }: { property: Property }) {
  const dates = useMemo(() => defaultDateRange(), []);
  const [checkIn, setCheckIn] = useState(dates.checkIn);
  const [checkOut, setCheckOut] = useState(dates.checkOut);
  const [guestCount, setGuestCount] = useState(2);
  const [language, setLanguage] = useState<Locale>("en");
  const [baseRoomTypes, setBaseRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<AvailableRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedBooking | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "NO",
    specialRequests: "",
  });

  // Load the full room-type catalog once. This is what makes the page feel
  // populated before the visitor touches the date picker — Option 1 of the
  // empty-state fix. Without this the left column is just a placeholder card.
  useEffect(() => {
    let cancelled = false;
    async function loadRoomTypes() {
      try {
        const response = await fetch(`/api/properties/${property.slug}/rooms`);
        if (!response.ok) return;
        const payload = await response.json();
        if (cancelled) return;
        const list: RoomType[] = payload.roomTypes ?? [];
        setBaseRoomTypes(list);
        // Pre-select the first room so the booking summary's CTA reflects
        // a default choice even before search runs.
        setSelectedRoomId((current) => current || list[0]?.id || "");
      } catch {
        // Network failure — leave baseRoomTypes empty; the empty-state copy still renders.
      }
    }
    loadRoomTypes();
    return () => {
      cancelled = true;
    };
  }, [property.slug]);

  const searchAvailability = useCallback(
    async (silent = false) => {
      if (!checkIn || !checkOut || checkOut <= checkIn) {
        if (!silent) setError("Pick a check-out date after the check-in date.");
        return;
      }
      if (!silent) setLoading(true);
      setError("");
      setCreated(null);
      try {
        const response = await fetch(
          `/api/properties/${property.slug}/availability?checkIn=${checkIn}&checkOut=${checkOut}`,
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not check availability");
        }
        const availableRooms: AvailableRoom[] = payload.rooms ?? [];
        setRooms(availableRooms);
        setSelectedRoomId((current) => {
          if (current && availableRooms.some((room) => room.id === current && room.availableCount > 0)) {
            return current;
          }
          return availableRooms.find((room) => room.availableCount > 0)?.id ?? current;
        });
        if (!silent && availableRooms.length === 0) {
          setError("No rooms are available for those dates.");
        }
      } catch (caught) {
        if (!silent) {
          setRooms([]);
          setError(caught instanceof Error ? caught.message : "Could not check availability");
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [property.slug, checkIn, checkOut],
  );

  // Auto-run availability for the default dates once the base list lands.
  // This means the visitor lands on the page already seeing real per-stay
  // pricing, not just base-rate cards. setTimeout defers the fetch so the
  // setState calls inside searchAvailability happen outside this effect's
  // synchronous tick (keeps react-hooks/set-state-in-effect happy).
  useEffect(() => {
    if (baseRoomTypes.length === 0) return;
    if (!checkIn || !checkOut || checkOut <= checkIn) return;
    const handle = setTimeout(() => {
      void searchAvailability(true);
    }, 0);
    return () => clearTimeout(handle);
  }, [baseRoomTypes.length, checkIn, checkOut, searchAvailability]);

  async function createBooking() {
    setBookingLoading(true);
    setError("");
    try {
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
      const payload = (await response.json()) as CreatedBooking & { error?: unknown };
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Could not create booking");
      }
      if (payload.mode === "stripe" && payload.checkoutUrl) {
        window.location.href = payload.checkoutUrl;
        return;
      }
      setCreated(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create booking");
    } finally {
      setBookingLoading(false);
    }
  }

  // Merge base list with date-specific availability so cards never disappear:
  // before search, every card shows "from X/night"; after search, the same card
  // upgrades to a per-stay subtotal + availability badge.
  const displayRooms: DisplayRoom[] = useMemo(() => {
    if (baseRoomTypes.length === 0) return [];
    const availability = new Map(rooms.map((room) => [room.id, room]));
    return baseRoomTypes.map((rt) => availability.get(rt.id) ?? rt);
  }, [baseRoomTypes, rooms]);

  const selectedRoom = useMemo(() => {
    const fromAvailability = rooms.find((room) => room.id === selectedRoomId);
    if (fromAvailability) return fromAvailability;
    return baseRoomTypes.find((rt) => rt.id === selectedRoomId);
  }, [rooms, baseRoomTypes, selectedRoomId]);
  const selectedHasAvailability = (selectedRoom as AvailableRoom | undefined)?.price !== undefined;
  const nights = nightsBetween(checkIn, checkOut);
  const guestFormValid = form.firstName.trim() && form.lastName.trim() && /.+@.+\..+/.test(form.email);
  const datesValid = Boolean(checkIn && checkOut && checkOut > checkIn);

  // Hardcoded to a generic western-Norway fjord coordinate since the demo property
  // city ("Demovik") is fictional. Swap to property-driven coords once the real
  // client property is seeded.
  const mapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=6.5,62.2,7.5,62.6&layer=mapnik&marker=62.4,7.0`;
  const mapLinkUrl = `https://www.openstreetmap.org/?mlat=62.4&mlon=7.0&zoom=10`;

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
            {property.heroImageUrl ? (
              <div className="relative h-72">
                <Image
                  src={property.heroImageUrl}
                  alt={property.name}
                  fill
                  className="object-cover"
                  priority
                  unoptimized
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/75 to-transparent p-6 text-white">
                  <h2 className="max-w-xl text-4xl font-semibold tracking-tight">Book a quiet fjord stay</h2>
                  <p className="mt-2 max-w-2xl text-sm text-white/85">
                    Compare live demo availability, see nightly pricing rules, and create a test booking without real payment keys.
                  </p>
                </div>
              </div>
            ) : null}
            <div className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_120px_160px]">
              <div>
                <FieldLabel>Check-in</FieldLabel>
                <TextInput
                  type="date"
                  value={checkIn}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => {
                    const next = event.target.value;
                    setCheckIn(next);
                    if (next && checkOut <= next) {
                      const after = new Date(next);
                      after.setDate(after.getDate() + 1);
                      setCheckOut(after.toISOString().slice(0, 10));
                    }
                  }}
                />
              </div>
              <div>
                <FieldLabel>Check-out</FieldLabel>
                <TextInput
                  type="date"
                  value={checkOut}
                  min={checkIn}
                  onChange={(event) => setCheckOut(event.target.value)}
                />
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
                <Button className="w-full" onClick={() => void searchAvailability()} disabled={loading || !datesValid}>
                  <CalendarDays className="h-4 w-4" />
                  {loading ? "Checking" : "Update prices"}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold text-slate-950">Rooms</h2>
            <p className="text-xs text-slate-500">
              {rooms.length > 0
                ? `Prices reflect ${nights} ${nights === 1 ? "night" : "nights"} including seasonal and weekend rules.`
                : "Pick dates to see per-stay pricing — base nightly rates shown for now."}
            </p>
          </div>

          <div className="grid gap-4">
            {displayRooms.length === 0 ? (
              <div className="rounded-lg border border-dashed border-teal-200 bg-white p-8 text-center">
                <BedDouble className="mx-auto h-8 w-8 text-teal-600" />
                <h3 className="mt-3 text-lg font-semibold text-slate-950">Loading rooms…</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Fetching the room catalog from the demo property.
                </p>
              </div>
            ) : (
              displayRooms.map((room) => {
                const isAvailable = room.availableCount === undefined || room.availableCount > 0;
                const isSelected = selectedRoomId === room.id;
                return (
                  <button
                    key={room.id}
                    onClick={() => isAvailable && setSelectedRoomId(room.id)}
                    disabled={!isAvailable}
                    className={`grid overflow-hidden rounded-lg border bg-white text-left shadow-sm transition md:grid-cols-[220px_1fr] ${
                      isSelected && isAvailable
                        ? "border-teal-500 ring-4 ring-teal-100"
                        : isAvailable
                          ? "border-slate-200 hover:border-teal-300"
                          : "border-slate-200 opacity-60"
                    }`}
                  >
                    <div className="relative h-48 md:h-full">
                      {room.photoUrls[0] ? (
                        <Image
                          src={room.photoUrls[0]}
                          alt={room.name[language]}
                          fill
                          className="object-cover"
                          loading="eager"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-slate-100 text-slate-400">
                          <BedDouble className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-semibold text-slate-950">{room.name[language]}</h3>
                          <p className="mt-1 text-sm text-slate-600">{room.description[language]}</p>
                        </div>
                        <div className="text-right">
                          {room.price ? (
                            <>
                              <div className="text-lg font-semibold text-slate-950">
                                {formatCurrency(room.price.subtotal)}
                              </div>
                              <div className="text-xs text-slate-500">
                                {nights} {nights === 1 ? "night" : "nights"} total
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-lg font-semibold text-slate-950">
                                {formatCurrency(room.basePrice)}
                              </div>
                              <div className="text-xs text-slate-500">from / night</div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {room.availableCount === undefined ? (
                          <Badge tone="slate">{room.maxGuests > 1 ? "Multiple rooms" : "Limited rooms"}</Badge>
                        ) : room.availableCount > 0 ? (
                          <Badge tone="teal">{room.availableCount} available</Badge>
                        ) : (
                          <Badge tone="amber">Sold out for these dates</Badge>
                        )}
                        <Badge tone={room.hasBathroom ? "green" : "amber"}>
                          {room.hasBathroom ? "Private bath" : "Shared bath"}
                        </Badge>
                        <Badge tone="slate">
                          Up to {room.maxGuests} {room.maxGuests === 1 ? "guest" : "guests"}
                        </Badge>
                      </div>
                      {room.price ? (
                        <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                          {room.price.nights.map((night) => (
                            <div key={night.date} className="flex justify-between rounded-md bg-slate-50 px-3 py-2">
                              <span>{formatDate(night.date)}</span>
                              <span className="font-medium text-slate-950">{formatCurrency(night.price)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                          {room.amenities.slice(0, 5).map((amenity) => (
                            <span key={amenity} className="rounded-full bg-slate-100 px-2.5 py-1 capitalize">
                              {amenity.replaceAll("_", " ")}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {error && displayRooms.length > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {error}
            </div>
          ) : null}

          <section className="rounded-lg border border-teal-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-teal-700">
              <Sparkles className="h-4 w-4" />
              What is included
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Stay highlights</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Every room includes the basics for a comfortable fjord stay. Add-on services like guided hikes and laundry are billed at the front desk.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {HIGHLIGHTS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title.en} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                    <Icon className="h-6 w-6 text-teal-600" />
                    <h3 className="mt-3 text-sm font-semibold text-slate-950">{item.title[language]}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.body[language]}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <Bath className="h-4 w-4 text-teal-600" />
                Towels and linen included
              </div>
              <div className="flex items-center gap-2">
                <ShowerHead className="h-4 w-4 text-teal-600" />
                Daily housekeeping on request
              </div>
              <div className="flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-teal-600" />
                Extra bed available on demand
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-teal-100 bg-white shadow-sm">
            <div className="grid gap-0 md:grid-cols-[1fr_1.2fr]">
              <div className="space-y-4 p-6">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-teal-700">
                  <MapPin className="h-4 w-4" />
                  Location
                </div>
                <h2 className="text-2xl font-semibold text-slate-950">Find {property.name}</h2>
                <p className="text-sm text-slate-600">
                  We are five minutes from the harbour and ten minutes from the nearest bus stop. The fjord trail starts right outside the front door.
                </p>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="font-semibold text-slate-950">{property.name}</div>
                  <div className="mt-1 text-slate-600">{property.address}</div>
                  <div className="text-slate-600">
                    {property.postalCode} {property.city}, {property.country}
                  </div>
                  <div className="mt-3 border-t border-slate-200 pt-3 text-slate-600">
                    <div>
                      Check-in from <span className="font-medium text-slate-950">{property.checkInTime}</span>
                    </div>
                    <div>
                      Check-out by <span className="font-medium text-slate-950">{property.checkOutTime}</span>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-slate-200 pt-3 text-slate-600">
                    <div>{property.contactPhone}</div>
                    <div>{property.contactEmail}</div>
                  </div>
                  <a
                    href={mapLinkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline"
                  >
                    Open in OpenStreetMap →
                  </a>
                </div>
              </div>
              <div className="relative min-h-[260px] bg-slate-100">
                <iframe
                  title={`Map of ${property.city}`}
                  src={mapEmbedUrl}
                  className="absolute inset-0 h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </section>
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
                {selectedHasAvailability
                  ? formatCurrency((selectedRoom as AvailableRoom).price.subtotal)
                  : selectedRoom
                    ? `${formatCurrency(selectedRoom.basePrice)} / night`
                    : "-"}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">{property.cancellationInfo[language]}</p>
          </div>

          {error && displayRooms.length > 0 ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {error}
            </div>
          ) : null}

          <Button
            className="mt-5 w-full"
            disabled={!selectedRoom || !selectedHasAvailability || bookingLoading || !guestFormValid}
            onClick={createBooking}
          >
            <CreditCard className="h-4 w-4" />
            {bookingLoading ? "Confirming booking" : "Pay & confirm demo booking"}
          </Button>
          {!selectedHasAvailability && selectedRoom ? (
            <p className="mt-2 text-xs text-slate-500">
              Pick valid dates and tap Update prices to confirm availability before booking.
            </p>
          ) : !guestFormValid && selectedRoom ? (
            <p className="mt-2 text-xs text-slate-500">
              Enter your first name, last name, and a valid email to continue.
            </p>
          ) : null}

          {created ? (
            <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 font-semibold text-emerald-800">
                <CircleCheck className="h-5 w-5" />
                Booking created
              </div>
              <p className="mt-1 text-sm text-emerald-700">
                Reference {created.booking.bookingRef}. Open Checkout to complete payment.
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
