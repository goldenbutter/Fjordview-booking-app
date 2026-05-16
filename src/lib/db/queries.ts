import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import {
  autoAssignRoom as autoAssignRoomPure,
  getAvailableRoomTypes as getAvailableRoomTypesPure,
} from "@/lib/availability";
import { createBookingRef } from "@/lib/booking-ref";
import { isUuid } from "@/lib/api-validation";
import type {
  Booking,
  CancellationPolicy,
  CleaningTask,
  Guest,
  Locale,
  PaymentStatus,
  PricingRule,
  Property,
  Room,
  RoomType,
} from "@/types";

// ---- DB row → runtime type mappers ----

type PropertyRow = typeof schema.properties.$inferSelect;
type RoomTypeRow = typeof schema.roomTypes.$inferSelect;
type RoomRow = typeof schema.rooms.$inferSelect;
type PricingRuleRow = typeof schema.pricingRules.$inferSelect;
type GuestRow = typeof schema.guests.$inferSelect;
type BookingRow = typeof schema.bookings.$inferSelect;
type CleaningTaskRow = typeof schema.cleaningTasks.$inferSelect;
type CancellationPolicyRow = typeof schema.cancellationPolicies.$inferSelect;

function mapProperty(row: PropertyRow): Property {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    address: row.address ?? "",
    city: row.city ?? "",
    postalCode: row.postalCode ?? "",
    country: row.country ?? "NO",
    timezone: row.timezone ?? "Europe/Oslo",
    currency: row.currency ?? "NOK",
    logoUrl: row.logoUrl ?? undefined,
    primaryColor: row.primaryColor ?? "#0D9488",
    accentColor: row.accentColor ?? "#F59E0B",
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone ?? "",
    bookingRefPrefix: row.bookingRefPrefix ?? "GH",
    checkInTime: row.checkInTime ?? "15:00",
    checkOutTime: row.checkOutTime ?? "11:00",
    cancellationInfo: (row.cancellationInfo as Record<Locale, string>) ?? { no: "", en: "" },
  };
}

function mapRoomType(row: RoomTypeRow): RoomType {
  return {
    id: row.id,
    propertyId: row.propertyId,
    name: row.name as Record<Locale, string>,
    description: (row.description as Record<Locale, string>) ?? { no: "", en: "" },
    slug: row.slug,
    hasBathroom: row.hasBathroom ?? false,
    maxGuests: row.maxGuests ?? 2,
    basePrice: row.basePrice,
    amenities: (row.amenities as string[]) ?? [],
    photoUrls: row.photoUrls ?? [],
    sortOrder: row.sortOrder ?? 0,
    active: row.active ?? true,
  };
}

function mapRoom(row: RoomRow): Room {
  return {
    id: row.id,
    propertyId: row.propertyId,
    roomTypeId: row.roomTypeId,
    roomNumber: row.roomNumber,
    floor: row.floor ?? 0,
    notes: row.notes ?? undefined,
    active: row.active ?? true,
  };
}

function mapPricingRule(row: PricingRuleRow): PricingRule {
  return {
    id: row.id,
    propertyId: row.propertyId,
    roomTypeId: row.roomTypeId ?? undefined,
    name: row.name,
    ruleType: row.ruleType as PricingRule["ruleType"],
    priceOverride: row.priceOverride ?? undefined,
    modifierPct: row.modifierPct ?? undefined,
    startDate: row.startDate ?? undefined,
    endDate: row.endDate ?? undefined,
    daysOfWeek: row.daysOfWeek ?? undefined,
    priority: row.priority ?? 0,
    active: row.active ?? true,
  };
}

function mapGuest(row: GuestRow): Guest {
  return {
    id: row.id,
    propertyId: row.propertyId,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone ?? undefined,
    country: row.country ?? undefined,
    language: (row.language as Locale) ?? "no",
    totalBookings: row.totalBookings ?? 0,
    totalSpent: row.totalSpent ?? 0,
  };
}

function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    propertyId: row.propertyId,
    roomId: row.roomId ?? undefined,
    roomTypeId: row.roomTypeId ?? "",
    guestId: row.guestId ?? "",
    bookingRef: row.bookingRef,
    status: row.status as Booking["status"],
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    guestCount: row.guestCount ?? 1,
    totalPrice: row.totalPrice,
    currency: row.currency ?? "NOK",
    paymentStatus: (row.paymentStatus as PaymentStatus) ?? "unpaid",
    paidAmount: row.paidAmount ?? 0,
    specialRequests: row.specialRequests ?? undefined,
    source: (row.source as Booking["source"]) ?? "direct",
    language: (row.language as Locale) ?? "no",
    createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
  };
}

function mapCleaningTask(row: CleaningTaskRow): CleaningTask {
  return {
    id: row.id,
    propertyId: row.propertyId,
    roomId: row.roomId,
    bookingId: row.bookingId ?? undefined,
    taskDate: row.taskDate,
    status: (row.status as CleaningTask["status"]) ?? "pending",
    assignedTo: row.assignedTo ?? undefined,
    notes: row.notes ?? undefined,
  };
}

function mapCancellationPolicy(row: CancellationPolicyRow): CancellationPolicy {
  return {
    id: row.id,
    propertyId: row.propertyId,
    name: row.name,
    description: (row.description as Record<Locale, string>) ?? { no: "", en: "" },
    refundPct: row.refundPct,
    deadlineHours: row.deadlineHours,
    isDefault: row.isDefault ?? false,
    active: row.active ?? true,
  };
}

// ---- Property + room lookups ----

export async function getPropertyBySlug(slug: string): Promise<Property | null> {
  const db = getDb();
  const rows = await db.select().from(schema.properties).where(eq(schema.properties.slug, slug)).limit(1);
  return rows[0] ? mapProperty(rows[0]) : null;
}

export async function getActiveRoomTypes(propertyId: string): Promise<RoomType[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.roomTypes)
    .where(and(eq(schema.roomTypes.propertyId, propertyId), eq(schema.roomTypes.active, true)))
    .orderBy(asc(schema.roomTypes.sortOrder));
  return rows.map(mapRoomType);
}

export async function getAvailability(propertyId: string, checkIn: string, checkOut: string) {
  const db = getDb();
  const [roomTypes, rooms, pricingRules, overlappingBookings] = await Promise.all([
    db.select().from(schema.roomTypes).where(eq(schema.roomTypes.propertyId, propertyId)),
    db.select().from(schema.rooms).where(eq(schema.rooms.propertyId, propertyId)),
    db.select().from(schema.pricingRules).where(eq(schema.pricingRules.propertyId, propertyId)),
    db
      .select()
      .from(schema.bookings)
      .where(
        and(
          eq(schema.bookings.propertyId, propertyId),
          sql`${schema.bookings.status} NOT IN ('cancelled', 'no_show')`,
          // half-open overlap: checkIn < $checkOut AND checkOut > $checkIn
          sql`${schema.bookings.checkIn} < ${checkOut}`,
          sql`${schema.bookings.checkOut} > ${checkIn}`,
        ),
      ),
  ]);

  return getAvailableRoomTypesPure(
    propertyId,
    checkIn,
    checkOut,
    roomTypes.map(mapRoomType),
    rooms.map(mapRoom),
    overlappingBookings.map(mapBooking),
    pricingRules.map(mapPricingRule),
  );
}

// ---- Booking creation (transactional) ----

export type CreateBookingInput = {
  propertyId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  totalPrice: number;
  currency: string;
  language: Locale;
  specialRequests?: string;
  guest: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    country?: string;
  };
  // Optional overrides used by the admin manual-booking flow.
  // For the public flow these stay undefined and the booking is recorded
  // as confirmed + fully_paid + paidAmount = totalPrice.
  status?: Booking["status"];
  paymentStatus?: PaymentStatus;
  paidAmount?: number;
  source?: Booking["source"];
};

export type CreateBookingResult = {
  property: Property;
  booking: Booking;
  guest: Guest;
  roomType: RoomType;
  room: Room | null;
};

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const db = getDb();

  const status = input.status ?? "confirmed";
  const paymentStatus = input.paymentStatus ?? "fully_paid";
  const paidAmount = input.paidAmount ?? input.totalPrice;
  const source = input.source ?? "direct";

  return db.transaction(async (tx) => {
    // Lock per-property to serialize booking ref generation + room assignment for this property.
    // Other properties insert concurrently without contention.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${input.propertyId}::text))`);

    const propertyRows = await tx
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.id, input.propertyId))
      .limit(1);
    if (propertyRows.length === 0) throw new Error("Property not found");
    const property = mapProperty(propertyRows[0]);

    const roomTypeRows = await tx
      .select()
      .from(schema.roomTypes)
      .where(eq(schema.roomTypes.id, input.roomTypeId))
      .limit(1);
    if (roomTypeRows.length === 0) throw new Error("Room type not found");
    const roomType = mapRoomType(roomTypeRows[0]);

    const propertyRooms = await tx
      .select()
      .from(schema.rooms)
      .where(eq(schema.rooms.propertyId, input.propertyId));
    const overlapping = await tx
      .select()
      .from(schema.bookings)
      .where(
        and(
          eq(schema.bookings.propertyId, input.propertyId),
          sql`${schema.bookings.status} NOT IN ('cancelled', 'no_show')`,
          sql`${schema.bookings.checkIn} < ${input.checkOut}`,
          sql`${schema.bookings.checkOut} > ${input.checkIn}`,
        ),
      );

    const assignedRoom = autoAssignRoomPure(
      {
        propertyId: input.propertyId,
        roomTypeId: input.roomTypeId,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
      },
      propertyRooms.map(mapRoom),
      overlapping.map(mapBooking),
    );

    // Guest upsert by (property_id, email). Increment totals.
    const existingGuestRows = await tx
      .select()
      .from(schema.guests)
      .where(
        and(
          eq(schema.guests.propertyId, input.propertyId),
          eq(schema.guests.email, input.guest.email),
        ),
      )
      .limit(1);

    let guestRow: GuestRow;
    if (existingGuestRows.length > 0) {
      const previous = existingGuestRows[0];
      const [updated] = await tx
        .update(schema.guests)
        .set({
          firstName: input.guest.firstName,
          lastName: input.guest.lastName,
          phone: input.guest.phone ?? previous.phone,
          country: input.guest.country ?? previous.country,
          language: input.language,
          totalBookings: (previous.totalBookings ?? 0) + 1,
          totalSpent: (previous.totalSpent ?? 0) + paidAmount,
        })
        .where(eq(schema.guests.id, previous.id))
        .returning();
      guestRow = updated;
    } else {
      const [inserted] = await tx
        .insert(schema.guests)
        .values({
          propertyId: input.propertyId,
          email: input.guest.email,
          firstName: input.guest.firstName,
          lastName: input.guest.lastName,
          phone: input.guest.phone,
          country: input.guest.country,
          language: input.language,
          totalBookings: 1,
          totalSpent: paidAmount,
        })
        .returning();
      guestRow = inserted;
    }

    // Generate booking ref. Use MAX(suffix) + 1 within the advisory lock to avoid collisions.
    const refPrefix = property.bookingRefPrefix;
    const year = new Date().getFullYear();
    const refLikePattern = `${refPrefix}-${year}-%`;
    const existingRefs = await tx
      .select({ ref: schema.bookings.bookingRef })
      .from(schema.bookings)
      .where(
        and(
          eq(schema.bookings.propertyId, input.propertyId),
          sql`${schema.bookings.bookingRef} LIKE ${refLikePattern}`,
        ),
      );
    const highest = existingRefs.reduce((max, row) => {
      const tail = row.ref.split("-").pop() ?? "0";
      const n = parseInt(tail, 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    const bookingRef = createBookingRef(refPrefix, highest + 1, new Date());

    // NOTE: Stripe Checkout is not yet wired. For the public flow, default is
    // "confirmed + fully_paid" so the demo shows real persistence end-to-end.
    // The admin manual-booking flow passes status/paymentStatus/paidAmount
    // through for walk-ins paid at reception, deposits, or pay-later.
    const [bookingRow] = await tx
      .insert(schema.bookings)
      .values({
        propertyId: input.propertyId,
        roomId: assignedRoom?.id ?? null,
        roomTypeId: input.roomTypeId,
        guestId: guestRow.id,
        bookingRef,
        status,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        guestCount: input.guestCount,
        totalPrice: input.totalPrice,
        currency: input.currency,
        paymentStatus,
        paidAmount,
        specialRequests: input.specialRequests,
        source,
        language: input.language,
      })
      .returning();

    // Cleaning task on checkout date if a room was assigned
    if (assignedRoom) {
      await tx.insert(schema.cleaningTasks).values({
        propertyId: input.propertyId,
        roomId: assignedRoom.id,
        bookingId: bookingRow.id,
        taskDate: input.checkOut,
        status: "pending",
      });
    }

    return {
      property,
      roomType,
      booking: mapBooking(bookingRow),
      guest: mapGuest(guestRow),
      room: assignedRoom,
    };
  });
}

// ---- Booking self-service (lookup + cancel) ----

export type BookingLookupResult = {
  property: Property;
  booking: Booking;
  guest: Guest;
  roomType: RoomType;
  room: Room | null;
} | null;

export async function getBookingByRef(ref: string, email?: string): Promise<BookingLookupResult> {
  const db = getDb();
  const bookingRows = await db
    .select()
    .from(schema.bookings)
    .where(eq(schema.bookings.bookingRef, ref))
    .limit(1);
  if (bookingRows.length === 0) return null;
  const booking = mapBooking(bookingRows[0]);

  const [propertyRow] = await db
    .select()
    .from(schema.properties)
    .where(eq(schema.properties.id, booking.propertyId))
    .limit(1);
  if (!propertyRow) return null;
  const property = mapProperty(propertyRow);

  const guestRows = booking.guestId
    ? await db.select().from(schema.guests).where(eq(schema.guests.id, booking.guestId)).limit(1)
    : [];
  if (guestRows.length === 0) return null;
  const guest = mapGuest(guestRows[0]);

  if (email && guest.email.toLowerCase() !== email.toLowerCase()) {
    return null;
  }

  const roomTypeRows = booking.roomTypeId
    ? await db.select().from(schema.roomTypes).where(eq(schema.roomTypes.id, booking.roomTypeId)).limit(1)
    : [];
  if (roomTypeRows.length === 0) return null;
  const roomType = mapRoomType(roomTypeRows[0]);

  const roomRows = booking.roomId
    ? await db.select().from(schema.rooms).where(eq(schema.rooms.id, booking.roomId)).limit(1)
    : [];
  const room = roomRows[0] ? mapRoom(roomRows[0]) : null;

  return { property, booking, guest, roomType, room };
}

export type CancelBookingInput = { ref: string; email: string; reason?: string };
export type CancelBookingResult =
  | { ok: true; booking: Booking; refundAmount: number; policy: CancellationPolicy | null }
  | { ok: false; reason: "not-found" | "email-mismatch" | "already-cancelled" | "past-deadline" };

export async function cancelBooking(input: CancelBookingInput): Promise<CancelBookingResult> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const bookingRows = await tx
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.bookingRef, input.ref))
      .limit(1);
    if (bookingRows.length === 0) return { ok: false, reason: "not-found" as const };
    const bookingRow = bookingRows[0];

    if (["cancelled", "no_show"].includes(bookingRow.status)) {
      return { ok: false, reason: "already-cancelled" as const };
    }

    const guestRows = bookingRow.guestId
      ? await tx.select().from(schema.guests).where(eq(schema.guests.id, bookingRow.guestId)).limit(1)
      : [];
    if (guestRows.length === 0 || guestRows[0].email.toLowerCase() !== input.email.toLowerCase()) {
      return { ok: false, reason: "email-mismatch" as const };
    }

    const [policyRow, propertyRow] = await Promise.all([
      tx
        .select()
        .from(schema.cancellationPolicies)
        .where(
          and(
            eq(schema.cancellationPolicies.propertyId, bookingRow.propertyId),
            eq(schema.cancellationPolicies.isDefault, true),
            eq(schema.cancellationPolicies.active, true),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]),
      tx
        .select()
        .from(schema.properties)
        .where(eq(schema.properties.id, bookingRow.propertyId))
        .limit(1)
        .then((rows) => rows[0]),
    ]);
    const policy = policyRow ? mapCancellationPolicy(policyRow) : null;

    let refundAmount = 0;
    if (policy) {
      const hoursUntilCheckIn = hoursUntilCheckInForProperty(
        bookingRow.checkIn,
        propertyRow?.checkInTime ?? "15:00",
        propertyRow?.timezone ?? "Europe/Oslo",
      );
      if (hoursUntilCheckIn < policy.deadlineHours) {
        return { ok: false, reason: "past-deadline" as const };
      }
      refundAmount = Math.round((bookingRow.paidAmount ?? 0) * (policy.refundPct / 100));
    } else {
      refundAmount = bookingRow.paidAmount ?? 0;
    }

    const [updated] = await tx
      .update(schema.bookings)
      .set({
        status: "cancelled",
        paymentStatus: refundAmount > 0 ? "refunded" : (bookingRow.paymentStatus ?? "unpaid"),
        cancelledAt: new Date(),
        cancellationReason: input.reason,
        roomId: null,
      })
      .where(eq(schema.bookings.id, bookingRow.id))
      .returning();

    // Drop the cleaning task for this booking (room is freed).
    await tx
      .delete(schema.cleaningTasks)
      .where(eq(schema.cleaningTasks.bookingId, bookingRow.id));

    return { ok: true, booking: mapBooking(updated), refundAmount, policy };
  });
}

// ---- Admin snapshot (used by /admin/* pages and dashboard route) ----

export type AdminBookingRow = Booking & {
  guestName: string;
  roomLabel: string;
  roomTypeLabel: string;
};

export type AdminCleaningRow = CleaningTask & {
  roomLabel: string;
};

export type AdminSnapshot = {
  property: Property;
  totalRooms: number;
  occupiedRooms: number;
  occupancyPct: number;
  revenue: number;
  arrivals: AdminBookingRow[];
  departures: AdminBookingRow[];
  recentBookings: AdminBookingRow[];
  guests: Guest[];
  rooms: Room[];
  roomTypes: RoomType[];
  pricingRules: PricingRule[];
  cleaningTasks: AdminCleaningRow[];
};

function enrichBooking(
  booking: Booking,
  guests: Guest[],
  rooms: Room[],
  roomTypes: RoomType[],
): AdminBookingRow {
  const guest = guests.find((g) => g.id === booking.guestId);
  const room = rooms.find((r) => r.id === booking.roomId);
  const roomType = roomTypes.find((rt) => rt.id === booking.roomTypeId);
  return {
    ...booking,
    guestName: guest ? `${guest.firstName} ${guest.lastName}` : "Unknown guest",
    roomLabel: room ? room.roomNumber : "Unassigned",
    roomTypeLabel: roomType?.name.en ?? "Room type",
  };
}

export async function getAdminSnapshotForProperty(propertyId: string): Promise<AdminSnapshot | null> {
  const db = getDb();
  const propertyRows = await db
    .select()
    .from(schema.properties)
    .where(eq(schema.properties.id, propertyId))
    .limit(1);
  if (propertyRows.length === 0) return null;
  const property = mapProperty(propertyRows[0]);

  const [roomsRows, roomTypesRows, pricingRulesRows, guestsRows, bookingsRows, cleaningRows] = await Promise.all([
    db.select().from(schema.rooms).where(eq(schema.rooms.propertyId, propertyId)),
    db.select().from(schema.roomTypes).where(eq(schema.roomTypes.propertyId, propertyId)),
    db.select().from(schema.pricingRules).where(eq(schema.pricingRules.propertyId, propertyId)),
    db.select().from(schema.guests).where(eq(schema.guests.propertyId, propertyId)),
    db
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.propertyId, propertyId))
      .orderBy(desc(schema.bookings.createdAt)),
    db
      .select()
      .from(schema.cleaningTasks)
      .where(eq(schema.cleaningTasks.propertyId, propertyId))
      .orderBy(asc(schema.cleaningTasks.taskDate)),
  ]);

  const rooms = roomsRows.map(mapRoom);
  const roomTypes = roomTypesRows.map(mapRoomType);
  const pricingRules = pricingRulesRows.map(mapPricingRule);
  const guests = guestsRows.map(mapGuest);
  const bookings = bookingsRows.map(mapBooking);
  const cleaningTasks = cleaningRows.map(mapCleaningTask);

  const totalRooms = rooms.filter((r) => r.active).length;
  const activeBookings = bookings.filter((b) => !["cancelled", "no_show"].includes(b.status));
  const occupiedRooms = new Set(activeBookings.map((b) => b.roomId).filter(Boolean)).size;
  const revenue = bookings.reduce((sum, b) => sum + (b.paidAmount ?? 0), 0);

  const today = new Date().toISOString().slice(0, 10);
  const arrivals = activeBookings
    .filter((b) => b.checkIn === today)
    .map((b) => enrichBooking(b, guests, rooms, roomTypes));
  const departures = activeBookings
    .filter((b) => b.checkOut === today)
    .map((b) => enrichBooking(b, guests, rooms, roomTypes));
  const recentBookings = bookings.map((b) => enrichBooking(b, guests, rooms, roomTypes));

  const cleaningWithLabels: AdminCleaningRow[] = cleaningTasks.map((task) => {
    const room = rooms.find((r) => r.id === task.roomId);
    return { ...task, roomLabel: room ? room.roomNumber : "Unassigned" };
  });

  return {
    property,
    totalRooms,
    occupiedRooms,
    occupancyPct: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
    revenue,
    arrivals,
    departures,
    recentBookings,
    guests,
    rooms,
    roomTypes,
    pricingRules,
    cleaningTasks: cleaningWithLabels,
  };
}

export async function getAdminSnapshotForSlug(slug: string): Promise<AdminSnapshot | null> {
  const property = await getPropertyBySlug(slug);
  if (!property) return null;
  return getAdminSnapshotForProperty(property.id);
}

// ---- Admin bookings list with filters ----

export type BookingsListFilters = {
  search?: string;
  status?: string;
  roomTypeId?: string;
  paymentStatus?: string;
};

export type ListBookingsResult = {
  bookings: AdminBookingRow[];
  totalCount: number;
};

export async function listBookings(propertyId: string, filters: BookingsListFilters): Promise<ListBookingsResult> {
  const db = getDb();
  const conditions = [eq(schema.bookings.propertyId, propertyId)];
  if (filters.status) conditions.push(eq(schema.bookings.status, filters.status));
  if (filters.roomTypeId) conditions.push(eq(schema.bookings.roomTypeId, filters.roomTypeId));
  if (filters.paymentStatus) conditions.push(eq(schema.bookings.paymentStatus, filters.paymentStatus));

  const baseRows = await db
    .select()
    .from(schema.bookings)
    .where(and(...conditions))
    .orderBy(desc(schema.bookings.createdAt));

  const guestsRows = await db.select().from(schema.guests).where(eq(schema.guests.propertyId, propertyId));
  const roomsRows = await db.select().from(schema.rooms).where(eq(schema.rooms.propertyId, propertyId));
  const roomTypesRows = await db.select().from(schema.roomTypes).where(eq(schema.roomTypes.propertyId, propertyId));

  const guests = guestsRows.map(mapGuest);
  const rooms = roomsRows.map(mapRoom);
  const roomTypes = roomTypesRows.map(mapRoomType);

  let enriched = baseRows.map((row) => enrichBooking(mapBooking(row), guests, rooms, roomTypes));

  if (filters.search) {
    const needle = filters.search.toLowerCase();
    enriched = enriched.filter((b) => {
      const guest = guests.find((g) => g.id === b.guestId);
      return (
        b.bookingRef.toLowerCase().includes(needle) ||
        b.guestName.toLowerCase().includes(needle) ||
        (guest?.email.toLowerCase().includes(needle) ?? false)
      );
    });
  }

  return { bookings: enriched, totalCount: enriched.length };
}

// ---- Booking detail (admin) ----

// Accepts either a booking UUID or a booking ref (e.g. "FV-2026-0001").
// Returns null for malformed IDs rather than letting Postgres raise.
export async function getBookingDetail(idOrRef: string) {
  if (isUuid(idOrRef)) {
    const db = getDb();
    const bookingRows = await db
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.id, idOrRef))
      .limit(1);
    if (bookingRows.length === 0) return null;
    return getBookingByRef(bookingRows[0].bookingRef);
  }
  return getBookingByRef(idOrRef);
}

// ---- Admin booking create (manual / walk-in) ----

export type CreateAdminBookingInput = CreateBookingInput;

export async function createAdminBooking(input: CreateAdminBookingInput): Promise<CreateBookingResult> {
  const paymentStatus = input.paymentStatus ?? "fully_paid";
  // For unpaid/deposit walk-ins the guest hasn't paid the full total yet; only
  // count what they actually handed over against guests.totalSpent.
  const paidAmount =
    input.paidAmount ?? (paymentStatus === "fully_paid" ? input.totalPrice : 0);
  return createBooking({
    ...input,
    paymentStatus,
    paidAmount,
    source: input.source ?? "admin",
  });
}

// ---- Cleaning task status update ----

export async function updateCleaningTaskStatus(
  taskId: string,
  status: "pending" | "in_progress" | "completed",
) {
  const db = getDb();
  const [updated] = await db
    .update(schema.cleaningTasks)
    .set({
      status,
      completedAt: status === "completed" ? new Date() : null,
    })
    .where(eq(schema.cleaningTasks.id, taskId))
    .returning();
  return updated ? mapCleaningTask(updated) : null;
}

// ---- Property update (admin settings) ----

export type UpdatePropertyInput = Partial<{
  name: string;
  address: string;
  city: string;
  postalCode: string;
  contactEmail: string;
  contactPhone: string;
  checkInTime: string;
  checkOutTime: string;
  primaryColor: string;
  accentColor: string;
}>;

export async function updateProperty(propertyId: string, input: UpdatePropertyInput) {
  const db = getDb();
  const [updated] = await db
    .update(schema.properties)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(schema.properties.id, propertyId))
    .returning();
  return updated ? mapProperty(updated) : null;
}

// ---- Guest detail with bookings ----

export async function getGuestById(propertyId: string, guestId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.guests)
    .where(and(eq(schema.guests.propertyId, propertyId), eq(schema.guests.id, guestId)))
    .limit(1);
  if (rows.length === 0) return null;
  const guest = mapGuest(rows[0]);

  const bookingsRows = await db
    .select()
    .from(schema.bookings)
    .where(and(eq(schema.bookings.propertyId, propertyId), eq(schema.bookings.guestId, guestId)))
    .orderBy(desc(schema.bookings.createdAt));

  const roomsRows = await db.select().from(schema.rooms).where(eq(schema.rooms.propertyId, propertyId));
  const roomTypesRows = await db.select().from(schema.roomTypes).where(eq(schema.roomTypes.propertyId, propertyId));

  const rooms = roomsRows.map(mapRoom);
  const roomTypes = roomTypesRows.map(mapRoomType);

  const bookings = bookingsRows.map((row) => enrichBooking(mapBooking(row), [guest], rooms, roomTypes));

  return { guest, bookings };
}

// ---- Calendar (admin) ----

export async function getCalendarData(propertyId: string, start: string, end: string) {
  const db = getDb();
  const [roomsRows, bookingsRows] = await Promise.all([
    db
      .select()
      .from(schema.rooms)
      .where(and(eq(schema.rooms.propertyId, propertyId), eq(schema.rooms.active, true)))
      .orderBy(asc(schema.rooms.roomNumber)),
    db
      .select()
      .from(schema.bookings)
      .where(
        and(
          eq(schema.bookings.propertyId, propertyId),
          sql`${schema.bookings.status} NOT IN ('cancelled', 'no_show')`,
          sql`${schema.bookings.checkIn} < ${end}`,
          sql`${schema.bookings.checkOut} > ${start}`,
        ),
      ),
  ]);
  return {
    rooms: roomsRows.map(mapRoom),
    bookings: bookingsRows.map(mapBooking),
  };
}

// Compute hours from "now" until the property's local check-in moment.
// Without this, treating the date as UTC midnight under-counts the window
// for Europe/Oslo by ~15h and wrongly rejects legitimate cancellations.
function hoursUntilCheckInForProperty(checkInDate: string, checkInTime: string, timeZone: string): number {
  const time = checkInTime.length >= 5 ? checkInTime.slice(0, 5) : "15:00";
  const isoLocal = `${checkInDate}T${time}:00`;
  const offsetMinutes = timeZoneOffsetMinutes(isoLocal, timeZone);
  const utcMs = Date.parse(`${isoLocal}Z`) - offsetMinutes * 60_000;
  return (utcMs - Date.now()) / 36e5;
}

function timeZoneOffsetMinutes(isoLocal: string, timeZone: string): number {
  const date = new Date(`${isoLocal}Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) if (p.type !== "literal") map[p.type] = p.value;
  const hour = map.hour === "24" ? "00" : map.hour;
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(hour),
    Number(map.minute),
    Number(map.second),
  );
  return Math.round((asUtc - date.getTime()) / 60_000);
}

