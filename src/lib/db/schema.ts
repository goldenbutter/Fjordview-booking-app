import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  country: text("country").default("NO"),
  timezone: text("timezone").default("Europe/Oslo"),
  currency: text("currency").default("NOK"),
  stripeAccountId: text("stripe_account_id"),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#0D9488"),
  accentColor: text("accent_color").default("#F59E0B"),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  bookingRefPrefix: text("booking_ref_prefix").default("GH"),
  checkInTime: time("check_in_time").default("15:00"),
  checkOutTime: time("check_out_time").default("11:00"),
  cancellationInfo: jsonb("cancellation_info"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const roomTypes = pgTable(
  "room_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
    name: jsonb("name").notNull(),
    description: jsonb("description"),
    slug: text("slug").notNull(),
    hasBathroom: boolean("has_bathroom").default(false),
    maxGuests: integer("max_guests").default(2),
    basePrice: integer("base_price").notNull(),
    amenities: jsonb("amenities").default([]),
    photoUrls: text("photo_urls").array().default([]),
    sortOrder: integer("sort_order").default(0),
    active: boolean("active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [uniqueIndex("room_types_property_slug_unique").on(table.propertyId, table.slug)],
);

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
    roomTypeId: uuid("room_type_id").notNull().references(() => roomTypes.id, { onDelete: "cascade" }),
    roomNumber: text("room_number").notNull(),
    floor: integer("floor"),
    notes: text("notes"),
    active: boolean("active").default(true),
  },
  (table) => [
    uniqueIndex("rooms_property_room_number_unique").on(table.propertyId, table.roomNumber),
    index("idx_rooms_type").on(table.propertyId, table.roomTypeId).where(sql`${table.active} = true`),
  ],
);

export const pricingRules = pgTable(
  "pricing_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
    roomTypeId: uuid("room_type_id").references(() => roomTypes.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    ruleType: text("rule_type").notNull(),
    priceOverride: integer("price_override"),
    modifierPct: integer("modifier_pct"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    daysOfWeek: integer("days_of_week").array(),
    priority: integer("priority").default(0),
    active: boolean("active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    check("pricing_rules_rule_type_check", sql`${table.ruleType} in ('seasonal', 'day_of_week', 'special')`),
    index("idx_pricing_active")
      .on(table.propertyId, table.roomTypeId, table.startDate, table.endDate)
      .where(sql`${table.active} = true`),
  ],
);

export const guests = pgTable(
  "guests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    phone: text("phone"),
    country: text("country"),
    language: text("language").default("no"),
    notes: text("notes"),
    totalBookings: integer("total_bookings").default(0),
    totalSpent: integer("total_spent").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("guests_property_email_unique").on(table.propertyId, table.email),
    index("idx_guests_email").on(table.propertyId, table.email),
    check("guests_language_check", sql`${table.language} in ('no', 'en')`),
  ],
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
    roomId: uuid("room_id").references(() => rooms.id, { onDelete: "set null" }),
    roomTypeId: uuid("room_type_id").references(() => roomTypes.id, { onDelete: "set null" }),
    guestId: uuid("guest_id").references(() => guests.id, { onDelete: "set null" }),
    bookingRef: text("booking_ref").notNull().unique(),
    status: text("status").notNull().default("pending"),
    checkIn: date("check_in").notNull(),
    checkOut: date("check_out").notNull(),
    nights: integer("nights").generatedAlwaysAs(sql`check_out - check_in`),
    guestCount: integer("guest_count").default(1),
    totalPrice: integer("total_price").notNull(),
    currency: text("currency").default("NOK"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    paymentStatus: text("payment_status").default("unpaid"),
    depositAmount: integer("deposit_amount"),
    paidAmount: integer("paid_amount").default(0),
    specialRequests: text("special_requests"),
    cancellationReason: text("cancellation_reason"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    source: text("source").default("direct"),
    language: text("language").default("no"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_bookings_availability")
      .on(table.propertyId, table.checkIn, table.checkOut)
      .where(sql`${table.status} not in ('cancelled', 'no_show')`),
    index("idx_bookings_ref").on(table.bookingRef),
    index("idx_bookings_status").on(table.propertyId, table.status),
    check("bookings_status_check", sql`${table.status} in ('pending','confirmed','checked_in','checked_out','cancelled','no_show')`),
    check("bookings_payment_status_check", sql`${table.paymentStatus} in ('unpaid','deposit_paid','fully_paid','refunded','partial_refund')`),
    check("bookings_source_check", sql`${table.source} in ('direct','admin','api','channel')`),
    check("bookings_language_check", sql`${table.language} in ('no', 'en')`),
    check("bookings_dates_check", sql`${table.checkOut} > ${table.checkIn}`),
  ],
);

export const cancellationPolicies = pgTable("cancellation_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: jsonb("description"),
  refundPct: integer("refund_pct").notNull(),
  deadlineHours: integer("deadline_hours").notNull(),
  isDefault: boolean("is_default").default(false),
  active: boolean("active").default(true),
});

export const cleaningTasks = pgTable(
  "cleaning_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
    roomId: uuid("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
    bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
    taskDate: date("task_date").notNull(),
    status: text("status").default("pending"),
    assignedTo: text("assigned_to"),
    notes: text("notes"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_cleaning_date").on(table.propertyId, table.taskDate, table.status),
    check("cleaning_tasks_status_check", sql`${table.status} in ('pending','in_progress','completed')`),
  ],
);

export const emailLog = pgTable("email_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  guestId: uuid("guest_id").references(() => guests.id, { onDelete: "set null" }),
  emailType: text("email_type").notNull(),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  language: text("language").notNull(),
  status: text("status").default("sent"),
  resendMessageId: text("resend_message_id"),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  check("email_log_language_check", sql`${table.language} in ('no', 'en')`),
  check("email_log_status_check", sql`${table.status} in ('sent','failed','bounced')`),
]);

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  supabaseUserId: uuid("supabase_user_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").default("staff"),
  permissions: jsonb("permissions").default({}),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  check("admin_users_role_check", sql`${table.role} in ('owner','manager','staff')`),
]);
