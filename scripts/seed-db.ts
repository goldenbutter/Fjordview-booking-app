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
} from "../src/lib/db/seed";

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
  const db = drizzle(client, { schema });

  const existing = await db
    .select({ id: schema.properties.id, name: schema.properties.name })
    .from(schema.properties)
    .where(eq(schema.properties.slug, demoProperty.slug));

  if (existing.length > 0) {
    console.log(`Property '${demoProperty.slug}' already exists (id=${existing[0].id}). Skipping seed.`);
    console.log("To re-seed, run scripts/reset-db.ts first.");
    await client.end();
    return;
  }

  const [property] = await db
    .insert(schema.properties)
    .values({
      name: demoProperty.name,
      slug: demoProperty.slug,
      address: demoProperty.address,
      city: demoProperty.city,
      postalCode: demoProperty.postalCode,
      country: demoProperty.country,
      timezone: demoProperty.timezone,
      currency: demoProperty.currency,
      contactEmail: demoProperty.contactEmail,
      contactPhone: demoProperty.contactPhone,
      bookingRefPrefix: demoProperty.bookingRefPrefix,
      primaryColor: demoProperty.primaryColor,
      accentColor: demoProperty.accentColor,
      checkInTime: demoProperty.checkInTime,
      checkOutTime: demoProperty.checkOutTime,
      cancellationInfo: demoProperty.cancellationInfo,
    })
    .returning();

  const roomTypeIdMap = new Map<string, string>();
  for (const rt of demoRoomTypes) {
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
  for (const r of demoRooms) {
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

  for (const rule of demoPricingRules) {
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
    name: demoCancellationPolicy.name,
    description: demoCancellationPolicy.description,
    refundPct: demoCancellationPolicy.refundPct,
    deadlineHours: demoCancellationPolicy.deadlineHours,
    isDefault: demoCancellationPolicy.isDefault,
    active: demoCancellationPolicy.active,
  });

  const guestIdMap = new Map<string, string>();
  for (const g of demoGuests) {
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
  for (const b of demoBookings) {
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

  for (const t of demoCleaningTasks) {
    await db.insert(schema.cleaningTasks).values({
      propertyId: property.id,
      roomId: roomIdMap.get(t.roomId)!,
      bookingId: t.bookingId ? bookingIdMap.get(t.bookingId) ?? null : null,
      taskDate: t.taskDate,
      status: t.status,
      assignedTo: t.assignedTo,
    });
  }

  console.log(`Seeded ${demoProperty.name}`);
  console.log(`  property_id          ${property.id}`);
  console.log(`  room_types           ${demoRoomTypes.length}`);
  console.log(`  rooms                ${demoRooms.length}`);
  console.log(`  pricing_rules        ${demoPricingRules.length}`);
  console.log(`  cancellation_policy  1`);
  console.log(`  guests               ${demoGuests.length}`);
  console.log(`  bookings             ${demoBookings.length}`);
  console.log(`  cleaning_tasks       ${demoCleaningTasks.length}`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
