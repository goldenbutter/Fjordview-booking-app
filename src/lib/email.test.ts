import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEmailSendInput, sendEmail } from "./email";
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
  logoUrl: "https://guesthub.test/logo.png",
  primaryColor: "#0D9488",
  accentColor: "#F59E0B",
  contactEmail: "host@example.com",
  contactPhone: "+47 400 00 000",
  bookingRefPrefix: "FV",
  checkInTime: "15:00",
  checkOutTime: "11:00",
  cancellationInfo: {
    no: "Gratis avbestilling inntil 48 timer for innsjekk.",
    en: "Free cancellation up to 48 hours before check-in.",
  },
};

const booking: Booking = {
  id: "booking-1",
  propertyId: property.id,
  roomId: "room-1",
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
  language: "no",
  createdAt: "2026-05-17T10:00:00.000Z",
};

const guest: Guest = {
  id: "guest-1",
  propertyId: property.id,
  email: "guest@example.com",
  firstName: "Ada",
  lastName: "Nord",
  phone: "+47 411 00 000",
  country: "NO",
  language: "no",
  totalBookings: 1,
  totalSpent: 349000,
};

const roomType: RoomType = {
  id: "room-type-1",
  propertyId: property.id,
  name: { no: "Fjordsuite", en: "Fjord Suite" },
  description: { no: "Utsikt mot fjorden", en: "Fjord view" },
  slug: "fjord-suite",
  hasBathroom: true,
  maxGuests: 2,
  basePrice: 174500,
  amenities: ["Wi-Fi"],
  photoUrls: [],
  sortOrder: 1,
  active: true,
};

const payload = {
  property,
  booking,
  guest,
  roomType,
  selfServiceUrl: "https://guesthub.test/booking/FV-2026-0009?email=guest%40example.com",
} as const;

describe("email send helpers", () => {
  it("builds a Norwegian confirmation email for the guest and email_log", () => {
    const message = buildEmailSendInput({
      ...payload,
      type: "confirmation",
      emailFrom: "onboarding@resend.dev",
    });

    assert.equal(message.send.from, "Fjordview Lodge <onboarding@resend.dev>");
    assert.equal(message.send.to, "guest@example.com");
    assert.equal(message.send.subject, "Bookingbekreftelse - FV-2026-0009");
    assert.match(message.send.text, /Fjordsuite/);
    assert.match(message.send.text, /https:\/\/guesthub\.test\/booking\/FV-2026-0009/);
    assert.equal(message.log.emailType, "confirmation");
    assert.equal(message.log.toEmail, "guest@example.com");
    assert.equal(message.log.subject, message.send.subject);
    assert.equal(message.log.language, "no");
    assert.equal(message.idempotencyKey, "email-confirmation-booking-1");
  });

  it("routes admin notifications to the property contact email", () => {
    const message = buildEmailSendInput({
      ...payload,
      booking: { ...booking, language: "en" },
      type: "admin_notification",
      emailFrom: "onboarding@resend.dev",
    });

    assert.equal(message.send.to, "host@example.com");
    assert.equal(message.send.subject, "New booking - FV-2026-0009");
    assert.equal(message.log.emailType, "admin_notification");
    assert.equal(message.log.toEmail, "host@example.com");
    assert.equal(message.log.language, "en");
  });

  it("logs local-demo sends when RESEND_API_KEY is absent", async () => {
    let logged: unknown;
    const result = await sendEmail(
      { ...payload, type: "cancellation" },
      {
        emailFrom: "onboarding@resend.dev",
        logEmail: async (entry) => {
          logged = entry;
          return entry;
        },
        logger: { info: () => undefined },
      },
    );

    assert.deepEqual(result, { status: "logged", provider: "local-demo" });
    assert.deepEqual(logged, {
      propertyId: "property-1",
      bookingId: "booking-1",
      guestId: "guest-1",
      emailType: "cancellation",
      toEmail: "guest@example.com",
      subject: "Avbestillingsbekreftelse - FV-2026-0009",
      language: "no",
      status: "sent",
      resendMessageId: undefined,
    });
  });

  it("logs failed Resend sends with the failed status", async () => {
    let logged: unknown;
    const result = await sendEmail(
      { ...payload, type: "receipt" },
      {
        resendApiKey: "re_test_key",
        emailFrom: "onboarding@resend.dev",
        resend: {
          emails: {
            send: async () => ({ data: null, error: { message: "invalid from" } }),
          },
        },
        logEmail: async (entry) => {
          logged = entry;
          return entry;
        },
      },
    );

    assert.equal(result.status, "failed");
    assert.equal(result.provider, "resend");
    assert.equal((logged as { status: string }).status, "failed");
    assert.equal((logged as { emailType: string }).emailType, "receipt");
  });
});
