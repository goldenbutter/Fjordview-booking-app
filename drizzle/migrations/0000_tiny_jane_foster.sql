CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"supabase_user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'staff',
	"permissions" jsonb DEFAULT '{}'::jsonb,
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "admin_users_supabase_user_id_unique" UNIQUE("supabase_user_id"),
	CONSTRAINT "admin_users_role_check" CHECK ("admin_users"."role" in ('owner','manager','staff'))
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"room_id" uuid,
	"room_type_id" uuid,
	"guest_id" uuid,
	"booking_ref" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"nights" integer GENERATED ALWAYS AS (check_out - check_in) STORED,
	"guest_count" integer DEFAULT 1,
	"total_price" integer NOT NULL,
	"currency" text DEFAULT 'NOK',
	"stripe_payment_intent_id" text,
	"stripe_checkout_session_id" text,
	"payment_status" text DEFAULT 'unpaid',
	"deposit_amount" integer,
	"paid_amount" integer DEFAULT 0,
	"special_requests" text,
	"cancellation_reason" text,
	"cancelled_at" timestamp with time zone,
	"source" text DEFAULT 'direct',
	"language" text DEFAULT 'no',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "bookings_booking_ref_unique" UNIQUE("booking_ref"),
	CONSTRAINT "bookings_status_check" CHECK ("bookings"."status" in ('pending','confirmed','checked_in','checked_out','cancelled','no_show')),
	CONSTRAINT "bookings_payment_status_check" CHECK ("bookings"."payment_status" in ('unpaid','deposit_paid','fully_paid','refunded','partial_refund')),
	CONSTRAINT "bookings_source_check" CHECK ("bookings"."source" in ('direct','admin','api','channel')),
	CONSTRAINT "bookings_language_check" CHECK ("bookings"."language" in ('no', 'en')),
	CONSTRAINT "bookings_dates_check" CHECK ("bookings"."check_out" > "bookings"."check_in")
);
--> statement-breakpoint
CREATE TABLE "cancellation_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" jsonb,
	"refund_pct" integer NOT NULL,
	"deadline_hours" integer NOT NULL,
	"is_default" boolean DEFAULT false,
	"active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "cleaning_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"booking_id" uuid,
	"task_date" date NOT NULL,
	"status" text DEFAULT 'pending',
	"assigned_to" text,
	"notes" text,
	"completed_at" timestamp with time zone,
	CONSTRAINT "cleaning_tasks_status_check" CHECK ("cleaning_tasks"."status" in ('pending','in_progress','completed'))
);
--> statement-breakpoint
CREATE TABLE "email_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"booking_id" uuid,
	"guest_id" uuid,
	"email_type" text NOT NULL,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"language" text NOT NULL,
	"status" text DEFAULT 'sent',
	"resend_message_id" text,
	"sent_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "email_log_language_check" CHECK ("email_log"."language" in ('no', 'en')),
	CONSTRAINT "email_log_status_check" CHECK ("email_log"."status" in ('sent','failed','bounced'))
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"email" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text,
	"country" text,
	"language" text DEFAULT 'no',
	"notes" text,
	"total_bookings" integer DEFAULT 0,
	"total_spent" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "guests_language_check" CHECK ("guests"."language" in ('no', 'en'))
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"room_type_id" uuid,
	"name" text NOT NULL,
	"rule_type" text NOT NULL,
	"price_override" integer,
	"modifier_pct" integer,
	"start_date" date,
	"end_date" date,
	"days_of_week" integer[],
	"priority" integer DEFAULT 0,
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "pricing_rules_rule_type_check" CHECK ("pricing_rules"."rule_type" in ('seasonal', 'day_of_week', 'special'))
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"address" text,
	"city" text,
	"postal_code" text,
	"country" text DEFAULT 'NO',
	"timezone" text DEFAULT 'Europe/Oslo',
	"currency" text DEFAULT 'NOK',
	"stripe_account_id" text,
	"logo_url" text,
	"primary_color" text DEFAULT '#0D9488',
	"accent_color" text DEFAULT '#F59E0B',
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"booking_ref_prefix" text DEFAULT 'GH',
	"check_in_time" time DEFAULT '15:00',
	"check_out_time" time DEFAULT '11:00',
	"cancellation_info" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "properties_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "room_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb,
	"slug" text NOT NULL,
	"has_bathroom" boolean DEFAULT false,
	"max_guests" integer DEFAULT 2,
	"base_price" integer NOT NULL,
	"amenities" jsonb DEFAULT '[]'::jsonb,
	"photo_urls" text[] DEFAULT '{}',
	"sort_order" integer DEFAULT 0,
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"room_type_id" uuid NOT NULL,
	"room_number" text NOT NULL,
	"floor" integer,
	"notes" text,
	"active" boolean DEFAULT true
);
--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cancellation_policies" ADD CONSTRAINT "cancellation_policies_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleaning_tasks" ADD CONSTRAINT "cleaning_tasks_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleaning_tasks" ADD CONSTRAINT "cleaning_tasks_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleaning_tasks" ADD CONSTRAINT "cleaning_tasks_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bookings_availability" ON "bookings" USING btree ("property_id","check_in","check_out") WHERE "bookings"."status" not in ('cancelled', 'no_show');--> statement-breakpoint
CREATE INDEX "idx_bookings_ref" ON "bookings" USING btree ("booking_ref");--> statement-breakpoint
CREATE INDEX "idx_bookings_status" ON "bookings" USING btree ("property_id","status");--> statement-breakpoint
CREATE INDEX "idx_cleaning_date" ON "cleaning_tasks" USING btree ("property_id","task_date","status");--> statement-breakpoint
CREATE UNIQUE INDEX "guests_property_email_unique" ON "guests" USING btree ("property_id","email");--> statement-breakpoint
CREATE INDEX "idx_guests_email" ON "guests" USING btree ("property_id","email");--> statement-breakpoint
CREATE INDEX "idx_pricing_active" ON "pricing_rules" USING btree ("property_id","room_type_id","start_date","end_date") WHERE "pricing_rules"."active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "room_types_property_slug_unique" ON "room_types" USING btree ("property_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "rooms_property_room_number_unique" ON "rooms" USING btree ("property_id","room_number");--> statement-breakpoint
CREATE INDEX "idx_rooms_type" ON "rooms" USING btree ("property_id","room_type_id") WHERE "rooms"."active" = true;
--> statement-breakpoint
ALTER TABLE "admin_users" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cancellation_policies" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cleaning_tasks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "email_log" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "guests" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "pricing_rules" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "properties" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "room_types" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "rooms" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.current_property_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_temp
AS $$
  SELECT property_id
  FROM public.admin_users
  WHERE supabase_user_id = auth.uid()
    AND active = true
  LIMIT 1
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.current_property_id() TO authenticated, anon;
--> statement-breakpoint
CREATE POLICY "Admins manage own property"
  ON "properties"
  FOR ALL
  TO authenticated
  USING ("id" = public.current_property_id())
  WITH CHECK ("id" = public.current_property_id());
--> statement-breakpoint
CREATE POLICY "Admins manage own property room types"
  ON "room_types"
  FOR ALL
  TO authenticated
  USING ("property_id" = public.current_property_id())
  WITH CHECK ("property_id" = public.current_property_id());
--> statement-breakpoint
CREATE POLICY "Admins manage own property rooms"
  ON "rooms"
  FOR ALL
  TO authenticated
  USING ("property_id" = public.current_property_id())
  WITH CHECK ("property_id" = public.current_property_id());
--> statement-breakpoint
CREATE POLICY "Admins manage own property pricing rules"
  ON "pricing_rules"
  FOR ALL
  TO authenticated
  USING ("property_id" = public.current_property_id())
  WITH CHECK ("property_id" = public.current_property_id());
--> statement-breakpoint
CREATE POLICY "Admins manage own property guests"
  ON "guests"
  FOR ALL
  TO authenticated
  USING ("property_id" = public.current_property_id())
  WITH CHECK ("property_id" = public.current_property_id());
--> statement-breakpoint
CREATE POLICY "Admins manage own property bookings"
  ON "bookings"
  FOR ALL
  TO authenticated
  USING ("property_id" = public.current_property_id())
  WITH CHECK ("property_id" = public.current_property_id());
--> statement-breakpoint
CREATE POLICY "Admins manage own property cancellation policies"
  ON "cancellation_policies"
  FOR ALL
  TO authenticated
  USING ("property_id" = public.current_property_id())
  WITH CHECK ("property_id" = public.current_property_id());
--> statement-breakpoint
CREATE POLICY "Admins manage own property cleaning tasks"
  ON "cleaning_tasks"
  FOR ALL
  TO authenticated
  USING ("property_id" = public.current_property_id())
  WITH CHECK ("property_id" = public.current_property_id());
--> statement-breakpoint
CREATE POLICY "Admins manage own property email log"
  ON "email_log"
  FOR ALL
  TO authenticated
  USING ("property_id" = public.current_property_id())
  WITH CHECK ("property_id" = public.current_property_id());
--> statement-breakpoint
CREATE POLICY "Admins manage own property admin users"
  ON "admin_users"
  FOR ALL
  TO authenticated
  USING ("property_id" = public.current_property_id())
  WITH CHECK ("property_id" = public.current_property_id());
