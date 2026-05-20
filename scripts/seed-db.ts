import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import {
  demoBookings,
  demoCancellationPolicy,
  demoCleaningTasks,
  demoGuests,
  demoPricingRules,
  demoProperty,
  demoRoomTypes,
  demoRooms,
  demoSecondaryCancellationPolicy,
  demoSecondaryProperty,
  demoSecondaryRoomTypes,
  demoSecondaryRooms,
} from "../src/lib/db/seed";
import type {
  Booking,
  CancellationPolicy,
  CleaningTask,
  Guest,
  PricingRule,
  Property,
  Room,
  RoomType,
} from "../src/types";

type Db = ReturnType<typeof drizzle<typeof schema>>;

type PropertyBundle = {
  property: Property;
  roomTypes: RoomType[];
  rooms: Room[];
  pricingRules: PricingRule[];
  cancellationPolicy: CancellationPolicy;
  guests: Guest[];
  bookings: Booking[];
  cleaningTasks: CleaningTask[];
};

async function seedPropertyBundle(db: Db, bundle: PropertyBundle) {
  const existing = await db
    .select({ id: schema.properties.id, name: schema.properties.name })
    .from(schema.properties)
    .where(eq(schema.properties.slug, bundle.property.slug));

  if (existing.length > 0) {
    console.log(
      `Property '${bundle.property.slug}' already exists (id=${existing[0].id}). Skipping.`,
    );
    return;
  }

  const [property] = await db
    .insert(schema.properties)
    .values({
      name: bundle.property.name,
      slug: bundle.property.slug,
      address: bundle.property.address,
      city: bundle.property.city,
      postalCode: bundle.property.postalCode,
      country: bundle.property.country,
      timezone: bundle.property.timezone,
      currency: bundle.property.currency,
      contactEmail: bundle.property.contactEmail,
      contactPhone: bundle.property.contactPhone,
      bookingRefPrefix: bundle.property.bookingRefPrefix,
      primaryColor: bundle.property.primaryColor,
      accentColor: bundle.property.accentColor,
      checkInTime: bundle.property.checkInTime,
      checkOutTime: bundle.property.checkOutTime,
      cancellationInfo: bundle.property.cancellationInfo,
    })
    .returning();

  const roomTypeIdMap = new Map<string, string>();
  for (const rt of bundle.roomTypes) {
    const [inserted] = await db
      .insert(schema.roomTypes)
      .values({
        propertyId: property.id,
        name: rt.name,
        description: rt.description,
        slug: rt.slug,
        hasBathroom: rt.hasBathroom,
        maxGuests: rt.maxGuests,
        basePrice: rt.basePrice,
        amenities: rt.amenities,
        photoUrls: rt.photoUrls,
        sortOrder: rt.sortOrder,
        active: rt.active,
      })
      .returning();
    roomTypeIdMap.set(rt.id, inserted.id);
  }

  const roomIdMap = new Map<string, string>();
  for (const r of bundle.rooms) {
    const [inserted] = await db
      .insert(schema.rooms)
      .values({
        propertyId: property.id,
        roomTypeId: roomTypeIdMap.get(r.roomTypeId)!,
        roomNumber: r.roomNumber,
        floor: r.floor,
        active: r.active,
      })
      .returning();
    roomIdMap.set(r.id, inserted.id);
  }

  for (const rule of bundle.pricingRules) {
    await db.insert(schema.pricingRules).values({
      propertyId: property.id,
      roomTypeId: rule.roomTypeId ? roomTypeIdMap.get(rule.roomTypeId) ?? null : null,
      name: rule.name,
      ruleType: rule.ruleType,
      priceOverride: rule.priceOverride,
      modifierPct: rule.modifierPct,
      startDate: rule.startDate,
      endDate: rule.endDate,
      daysOfWeek: rule.daysOfWeek,
      priority: rule.priority,
      active: rule.active,
    });
  }

  await db.insert(schema.cancellationPolicies).values({
    propertyId: property.id,
    name: bundle.cancellationPolicy.name,
    description: bundle.cancellationPolicy.description,
    refundPct: bundle.cancellationPolicy.refundPct,
    deadlineHours: bundle.cancellationPolicy.deadlineHours,
    isDefault: bundle.cancellationPolicy.isDefault,
    active: bundle.cancellationPolicy.active,
  });

  const guestIdMap = new Map<string, string>();
  for (const g of bundle.guests) {
    const [inserted] = await db
      .insert(schema.guests)
      .values({
        propertyId: property.id,
        email: g.email,
        firstName: g.firstName,
        lastName: g.lastName,
        phone: g.phone,
        country: g.country,
        language: g.language,
        totalBookings: g.totalBookings,
        totalSpent: g.totalSpent,
      })
      .returning();
    guestIdMap.set(g.id, inserted.id);
  }

  const bookingIdMap = new Map<string, string>();
  for (const b of bundle.bookings) {
    const [inserted] = await db
      .insert(schema.bookings)
      .values({
        propertyId: property.id,
        roomId: b.roomId ? roomIdMap.get(b.roomId) ?? null : null,
        roomTypeId: roomTypeIdMap.get(b.roomTypeId)!,
        guestId: guestIdMap.get(b.guestId) ?? null,
        bookingRef: b.bookingRef,
        status: b.status,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        guestCount: b.guestCount,
        totalPrice: b.totalPrice,
        currency: b.currency,
        paymentStatus: b.paymentStatus,
        paidAmount: b.paidAmount,
        source: b.source,
        language: b.language,
        specialRequests: b.specialRequests,
      })
      .returning();
    bookingIdMap.set(b.id, inserted.id);
  }

  for (const t of bundle.cleaningTasks) {
    await db.insert(schema.cleaningTasks).values({
      propertyId: property.id,
      roomId: roomIdMap.get(t.roomId)!,
      bookingId: t.bookingId ? bookingIdMap.get(t.bookingId) ?? null : null,
      taskDate: t.taskDate,
      status: t.status,
      assignedTo: t.assignedTo,
    });
  }

  console.log(`Seeded ${bundle.property.name}`);
  console.log(`  property_id          ${property.id}`);
  console.log(`  room_types           ${bundle.roomTypes.length}`);
  console.log(`  rooms                ${bundle.rooms.length}`);
  console.log(`  pricing_rules        ${bundle.pricingRules.length}`);
  console.log(`  cancellation_policy  1`);
  console.log(`  guests               ${bundle.guests.length}`);
  console.log(`  bookings             ${bundle.bookings.length}`);
  console.log(`  cleaning_tasks       ${bundle.cleaningTasks.length}`);
}

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
  const db = drizzle(client, { schema });

  const bundles: PropertyBundle[] = [
    {
      property: demoProperty,
      roomTypes: demoRoomTypes,
      rooms: demoRooms,
      pricingRules: demoPricingRules,
      cancellationPolicy: demoCancellationPolicy,
      guests: demoGuests,
      bookings: demoBookings,
      cleaningTasks: demoCleaningTasks,
    },
    {
      property: demoSecondaryProperty,
      roomTypes: demoSecondaryRoomTypes,
      rooms: demoSecondaryRooms,
      pricingRules: [],
      cancellationPolicy: demoSecondaryCancellationPolicy,
      guests: [],
      bookings: [],
      cleaningTasks: [],
    },
  ];

  for (const bundle of bundles) {
    await seedPropertyBundle(db, bundle);
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
