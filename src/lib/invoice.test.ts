import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInvoicePdf } from "./invoice";
import type { Booking, Guest, Property, RoomType } from "@/types";

const property: Property = {
  id: "property-1",
  name: "Fjordview Lodge",
  slug: "fjordview",
  address: "Harbor Road 1",
  city: "Alesund",
  postalCode: "6001",
  country: "NO",
  timezone: "Europe/Oslo",
  currency: "NOK",
  primaryColor: "#0D9488",
  accentColor: "#F59E0B",
  contactEmail: "host@example.com",
  contactPhone: "+47 400 00 000",
  bookingRefPrefix: "FV",
  checkInTime: "15:00",
  checkOutTime: "11:00",
  cancellationInfo: { no: "", en: "" },
};

const booking: Booking = {
  id: "booking-1",
  propertyId: property.id,
  roomTypeId: "room-type-1",
  guestId: "guest-1",
  bookingRef: "FV-2026-0009",
  status: "confirmed",
  checkIn: "2026-06-12",
  checkOut: "2026-06-14",
  guestCount: 2,
  totalPrice: 349000,
  currency: "NOK",
  paymentStatus: "fully_paid",
  paidAmount: 349000,
  source: "direct",
  language: "en",
  createdAt: "2026-05-17T10:00:00.000Z",
};

const guest: Guest = {
  id: "guest-1",
  propertyId: property.id,
  email: "guest@example.com",
  firstName: "Ada",
  lastName: "Nord",
  language: "en",
  totalBookings: 1,
  totalSpent: 349000,
};

const roomType: RoomType = {
  id: "room-type-1",
  propertyId: property.id,
  name: { no: "Fjordsuite", en: "Fjord Suite" },
  description: { no: "", en: "" },
  slug: "fjord-suite",
  hasBathroom: true,
  maxGuests: 2,
  basePrice: 174500,
  amenities: [],
  photoUrls: [],
  sortOrder: 1,
  active: true,
};

describe("invoice PDF", () => {
  it("creates a PDF attachment payload with invoice details", () => {
    const pdf = createInvoicePdf({ property, booking, guest, roomType });
    const text = pdf.toString("latin1");

    assert.match(text, /^%PDF-1\.4/);
    assert.match(text, /Invoice - FV-2026-0009/);
    assert.match(text, /Ada Nord/);
    assert.match(text, /Fjord Suite/);
    assert.match(text, /%%EOF\s*$/);
  });
});
