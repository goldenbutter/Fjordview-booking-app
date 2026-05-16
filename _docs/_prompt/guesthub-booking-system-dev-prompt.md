# GuestHub — Custom Booking System Prototype

> **Purpose:** Reusable prototype booking system for small accommodation providers (guesthouses, B&Bs, boutique hotels). Built once, deployed per client.
> **Agents:** Claude Code + Codex — this is the primary development prompt.
> **Architecture:** Multi-tenant from day one. Each client deployment is a configuration change, not a code change.

---

## 1. WHAT THIS IS

A complete booking system prototype that any small accommodation provider can use. The prototype ships with a fictional demo property called **"Fjordview Lodge"** — a small guesthouse with rooms, a café, and event space. This demo property exists purely for development and testing. When a real client orders, we:

1. Swap the demo property seed data for real client data
2. Point DNS to their domain
3. Switch from test/sandbox credentials to production credentials
4. Deploy to dedicated Supabase project + Vercel project

**No client names, logos, or business-specific content exist in the codebase.** Everything client-specific lives in the database and environment variables.

---

## 2. TECH STACK

```
Frontend:        Next.js 14+ (App Router)
UI:              Tailwind CSS + shadcn/ui
Backend:         Next.js API Routes / Server Actions
Database:        PostgreSQL (Supabase — Free tier for prototype)
Auth:            Supabase Auth (admin users) + magic links (guest self-service)
Payment:         Stripe (test/sandbox mode for prototype)
Email:           Resend (free tier — 100 emails/day for prototype)
File storage:    Supabase Storage (room photos, invoices)
Hosting:         Vercel (Hobby plan for prototype)
Language:        TypeScript throughout
ORM:             Drizzle ORM
```

### Free-tier constraints to design around

| Service | Prototype Tier | Limit | Production Tier |
|---------|---------------|-------|-----------------|
| **Supabase** | Free | 500 MB DB, 1 GB storage, 2 GB bandwidth, 50k auth MAU | Pro ($25/mo) |
| **Vercel** | Hobby | 100 GB bandwidth, 1 build concurrency, no team | Pro ($20/mo) |
| **Stripe** | Test/Sandbox | No real charges, test cards only | Live mode (same account) |
| **Resend** | Free | 100 emails/day, 1 domain | Pro ($20/mo) |

**Design rule:** Never hard-code anything that changes between tiers. All limits are operational, not architectural — the same code runs on free and paid.

---

## 3. ENVIRONMENT SEPARATION

The codebase supports three environments. The developer agent must never mix credentials across environments.

```
┌─────────────────────────────────────────────────────┐
│  PROTOTYPE (what we build now)                       │
│  Supabase: Free project (dev/test data)              │
│  Stripe:   Test/Sandbox (sk_test_*, pk_test_*)       │
│  Vercel:   Hobby plan                                │
│  Resend:   Free tier (dev domain)                    │
│  Domain:   *.vercel.app (auto-assigned)              │
├─────────────────────────────────────────────────────┤
│  STAGING (pre-launch per client)                     │
│  Supabase: Separate free project (client test data)  │
│  Stripe:   Same test/sandbox keys                    │
│  Vercel:   Same Hobby or client's Pro                │
│  Domain:   staging.clientdomain.no                   │
├─────────────────────────────────────────────────────┤
│  PRODUCTION (live per client)                        │
│  Supabase: Dedicated Pro project (real data)         │
│  Stripe:   Live keys (sk_live_*, pk_live_*)          │
│  Vercel:   Client's Pro plan                         │
│  Resend:   Pro tier (client's domain verified)       │
│  Domain:   clientdomain.no                           │
└─────────────────────────────────────────────────────┘
```

### Migration checklist (prototype → production)
This checklist lives in the repo as `MIGRATION.md` so the developer agent or a human can follow it:

1. **Supabase:** Create new Pro project → run all Drizzle migrations → seed with real client data → enable RLS → set up daily backups
2. **Stripe:** Toggle from test to live mode in Stripe dashboard → copy live keys to new `.env` → re-register webhook endpoint with live signing secret → verify webhook events fire correctly
3. **Vercel:** Create new project under client's team → connect repo (same branch or fork) → set production env vars → assign custom domain → enable analytics
4. **Resend:** Verify client's sending domain → update `EMAIL_FROM` in env → test all email templates with live delivery
5. **DNS:** Point client domain to Vercel → set up SSL (automatic via Vercel)
6. **Seed data:** Remove demo "Fjordview Lodge" property → insert real property, rooms, pricing, cancellation policies
7. **Smoke test:** Complete one full booking flow end-to-end with a real Stripe test card in live mode (Stripe allows this), verify email delivery, verify admin dashboard

---

## 4. DATABASE SCHEMA

Multi-tenant: every table has `property_id`. Every query filters by it. Every RLS policy scopes to it.

### Core tables

```sql
-- Properties (multi-tenant root — one row per client)
properties
  id              UUID PK DEFAULT gen_random_uuid()
  name            TEXT NOT NULL
  slug            TEXT UNIQUE NOT NULL       -- URL segment: /book/[slug]
  address         TEXT
  city            TEXT
  postal_code     TEXT
  country         TEXT DEFAULT 'NO'
  timezone        TEXT DEFAULT 'Europe/Oslo'
  currency        TEXT DEFAULT 'NOK'
  stripe_account_id TEXT                     -- for Stripe Connect when reselling
  logo_url        TEXT
  primary_color   TEXT DEFAULT '#0D9488'     -- teal default, client overrides
  accent_color    TEXT DEFAULT '#F59E0B'
  contact_email   TEXT NOT NULL
  contact_phone   TEXT
  booking_ref_prefix TEXT DEFAULT 'GH'      -- e.g. GH-2026-0001, client sets theirs
  check_in_time   TIME DEFAULT '15:00'
  check_out_time  TIME DEFAULT '11:00'
  cancellation_info JSONB                    -- default policy description shown to guests
  created_at      TIMESTAMPTZ DEFAULT now()
  updated_at      TIMESTAMPTZ DEFAULT now()

-- Room types (not individual rooms — small properties sell by type)
room_types
  id              UUID PK DEFAULT gen_random_uuid()
  property_id     UUID FK -> properties.id ON DELETE CASCADE
  name            JSONB NOT NULL             -- {"no": "Dobbeltrom med bad", "en": "Double with bathroom"}
  description     JSONB                      -- {"no": "...", "en": "..."}
  slug            TEXT NOT NULL
  has_bathroom    BOOLEAN DEFAULT false
  max_guests      INT DEFAULT 2
  base_price      INT NOT NULL               -- in smallest currency unit (øre for NOK)
  amenities       JSONB DEFAULT '[]'         -- ["wifi", "tv", "minibar"]
  photo_urls      TEXT[] DEFAULT '{}'
  sort_order      INT DEFAULT 0
  active          BOOLEAN DEFAULT true
  created_at      TIMESTAMPTZ DEFAULT now()
  UNIQUE(property_id, slug)

-- Physical rooms mapped to types
rooms
  id              UUID PK DEFAULT gen_random_uuid()
  property_id     UUID FK -> properties.id ON DELETE CASCADE
  room_type_id    UUID FK -> room_types.id ON DELETE CASCADE
  room_number     TEXT NOT NULL              -- "101" or "Birch Suite"
  floor           INT
  notes           TEXT                       -- internal only
  active          BOOLEAN DEFAULT true
  UNIQUE(property_id, room_number)

-- Pricing rules (seasonal, day-of-week, special)
pricing_rules
  id              UUID PK DEFAULT gen_random_uuid()
  property_id     UUID FK -> properties.id ON DELETE CASCADE
  room_type_id    UUID FK -> room_types.id ON DELETE SET NULL  -- NULL = all types
  name            TEXT NOT NULL
  rule_type       TEXT NOT NULL CHECK (rule_type IN ('seasonal', 'day_of_week', 'special'))
  price_override  INT                        -- absolute price in øre (NULL = use modifier)
  modifier_pct    INT                        -- +20 = 20% surcharge, -15 = 15% discount
  start_date      DATE                       -- NULL for recurring (day_of_week)
  end_date        DATE
  days_of_week    INT[]                      -- [4, 5] = Fri, Sat (0=Mon, 6=Sun)
  priority        INT DEFAULT 0              -- higher wins on conflict
  active          BOOLEAN DEFAULT true
  created_at      TIMESTAMPTZ DEFAULT now()

-- Guests
guests
  id              UUID PK DEFAULT gen_random_uuid()
  property_id     UUID FK -> properties.id ON DELETE CASCADE
  email           TEXT NOT NULL
  first_name      TEXT NOT NULL
  last_name       TEXT NOT NULL
  phone           TEXT
  country         TEXT
  language        TEXT DEFAULT 'no'          -- 'no' | 'en'
  notes           TEXT                       -- admin-only
  total_bookings  INT DEFAULT 0
  total_spent     INT DEFAULT 0              -- in øre
  created_at      TIMESTAMPTZ DEFAULT now()
  UNIQUE(property_id, email)

-- Bookings
bookings
  id              UUID PK DEFAULT gen_random_uuid()
  property_id     UUID FK -> properties.id ON DELETE CASCADE
  room_id         UUID FK -> rooms.id ON DELETE SET NULL
  room_type_id    UUID FK -> room_types.id ON DELETE SET NULL
  guest_id        UUID FK -> guests.id ON DELETE SET NULL
  booking_ref     TEXT UNIQUE NOT NULL       -- "GH-2026-0042"
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','confirmed','checked_in','checked_out','cancelled','no_show'))
  check_in        DATE NOT NULL
  check_out       DATE NOT NULL
  nights          INT GENERATED ALWAYS AS (check_out - check_in) STORED
  guest_count     INT DEFAULT 1
  total_price     INT NOT NULL               -- in øre
  currency        TEXT DEFAULT 'NOK'
  stripe_payment_intent_id  TEXT
  stripe_checkout_session_id TEXT
  payment_status  TEXT DEFAULT 'unpaid'
                  CHECK (payment_status IN ('unpaid','deposit_paid','fully_paid','refunded','partial_refund'))
  deposit_amount  INT
  paid_amount     INT DEFAULT 0
  special_requests TEXT
  cancellation_reason TEXT
  cancelled_at    TIMESTAMPTZ
  source          TEXT DEFAULT 'direct'      -- 'direct' | 'admin' | 'api' | 'channel'
  language        TEXT DEFAULT 'no'
  created_at      TIMESTAMPTZ DEFAULT now()
  updated_at      TIMESTAMPTZ DEFAULT now()

-- Cancellation policies
cancellation_policies
  id              UUID PK DEFAULT gen_random_uuid()
  property_id     UUID FK -> properties.id ON DELETE CASCADE
  name            TEXT NOT NULL
  description     JSONB                      -- {"no": "...", "en": "..."}
  refund_pct      INT NOT NULL               -- 100 = full, 0 = none
  deadline_hours  INT NOT NULL               -- hours before check-in
  is_default      BOOLEAN DEFAULT false
  active          BOOLEAN DEFAULT true

-- Cleaning tasks (auto-generated from check-outs)
cleaning_tasks
  id              UUID PK DEFAULT gen_random_uuid()
  property_id     UUID FK -> properties.id ON DELETE CASCADE
  room_id         UUID FK -> rooms.id ON DELETE CASCADE
  booking_id      UUID FK -> bookings.id ON DELETE SET NULL
  task_date       DATE NOT NULL
  status          TEXT DEFAULT 'pending'
                  CHECK (status IN ('pending','in_progress','completed'))
  assigned_to     TEXT
  notes           TEXT
  completed_at    TIMESTAMPTZ

-- Email log
email_log
  id              UUID PK DEFAULT gen_random_uuid()
  property_id     UUID FK -> properties.id ON DELETE CASCADE
  booking_id      UUID FK -> bookings.id ON DELETE SET NULL
  guest_id        UUID FK -> guests.id ON DELETE SET NULL
  email_type      TEXT NOT NULL              -- 'confirmation' | 'receipt' | 'reminder' | 'thank_you' | 'cancellation' | 'invoice'
  to_email        TEXT NOT NULL
  subject         TEXT NOT NULL
  language        TEXT NOT NULL
  status          TEXT DEFAULT 'sent'        -- 'sent' | 'failed' | 'bounced'
  resend_message_id TEXT
  sent_at         TIMESTAMPTZ DEFAULT now()

-- Admin users
admin_users
  id              UUID PK DEFAULT gen_random_uuid()
  property_id     UUID FK -> properties.id ON DELETE CASCADE
  supabase_user_id UUID UNIQUE NOT NULL
  email           TEXT NOT NULL
  name            TEXT NOT NULL
  role            TEXT DEFAULT 'staff'       -- 'owner' | 'manager' | 'staff'
  permissions     JSONB DEFAULT '{}'
  active          BOOLEAN DEFAULT true
  created_at      TIMESTAMPTZ DEFAULT now()
```

### Indexes

```sql
CREATE INDEX idx_bookings_availability ON bookings(property_id, check_in, check_out)
  WHERE status NOT IN ('cancelled', 'no_show');
CREATE INDEX idx_bookings_ref ON bookings(booking_ref);
CREATE INDEX idx_bookings_status ON bookings(property_id, status);
CREATE INDEX idx_rooms_type ON rooms(property_id, room_type_id) WHERE active = true;
CREATE INDEX idx_cleaning_date ON cleaning_tasks(property_id, task_date, status);
CREATE INDEX idx_guests_email ON guests(property_id, email);
CREATE INDEX idx_pricing_active ON pricing_rules(property_id, room_type_id, start_date, end_date)
  WHERE active = true;
```

### Row Level Security (template)

```sql
-- Every table follows this pattern
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (for API routes using SUPABASE_SERVICE_ROLE_KEY)
-- Anon/authenticated users see nothing by default
-- Admin users see their property's data via a helper function:

CREATE OR REPLACE FUNCTION auth.property_id()
RETURNS UUID AS $$
  SELECT property_id FROM admin_users
  WHERE supabase_user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE POLICY "Admin sees own property bookings"
  ON bookings FOR SELECT
  USING (property_id = auth.property_id());
```

---

## 5. AVAILABILITY QUERY

This is the core read operation — must be fast.

```sql
-- Available room types for a date range
SELECT
  rt.id,
  rt.name,
  rt.description,
  rt.has_bathroom,
  rt.max_guests,
  rt.base_price,
  rt.amenities,
  rt.photo_urls,
  COUNT(r.id) AS total_rooms,
  COUNT(r.id) - COALESCE(booked.cnt, 0) AS available_count
FROM room_types rt
JOIN rooms r ON r.room_type_id = rt.id AND r.active = true
LEFT JOIN LATERAL (
  SELECT COUNT(DISTINCT b.room_id) AS cnt
  FROM bookings b
  WHERE b.property_id = rt.property_id
    AND b.room_type_id = rt.id
    AND b.status NOT IN ('cancelled', 'no_show')
    AND b.check_in < $check_out
    AND b.check_out > $check_in
) booked ON true
WHERE rt.property_id = $property_id
  AND rt.active = true
GROUP BY rt.id, booked.cnt
HAVING COUNT(r.id) - COALESCE(booked.cnt, 0) > 0
ORDER BY rt.sort_order;
```

---

## 6. PRICING ENGINE

```typescript
// All prices in smallest currency unit (øre for NOK, cents for USD/EUR)

interface PriceBreakdown {
  nights: { date: string; price: number; appliedRule?: string }[];
  subtotal: number;
  currency: string;
}

function calculateNightlyPrice(
  basePrice: number,
  date: Date,
  rules: PricingRule[],
): { price: number; appliedRule?: string } {
  let price = basePrice;
  let appliedRule: string | undefined;

  // Filter applicable rules, sort by priority descending
  const applicable = rules
    .filter(r => r.active && matchesDate(r, date) && matchesDayOfWeek(r, date))
    .sort((a, b) => b.priority - a.priority);

  for (const rule of applicable) {
    if (rule.price_override !== null) {
      return { price: rule.price_override, appliedRule: rule.name };
    }
    if (rule.modifier_pct !== null) {
      price = Math.round(price * (1 + rule.modifier_pct / 100));
      appliedRule = rule.name;
    }
  }

  return { price, appliedRule };
}

function calculateStayPrice(
  basePrice: number,
  checkIn: Date,
  checkOut: Date,
  rules: PricingRule[],
  currency: string = 'NOK',
): PriceBreakdown {
  const nights = eachDayOfInterval({
    start: checkIn,
    end: subDays(checkOut, 1),
  });

  const breakdown = nights.map(date => {
    const { price, appliedRule } = calculateNightlyPrice(basePrice, date, rules);
    return { date: format(date, 'yyyy-MM-dd'), price, appliedRule };
  });

  return {
    nights: breakdown,
    subtotal: breakdown.reduce((sum, n) => sum + n.price, 0),
    currency,
  };
}
```

---

## 7. ROOM AUTO-ASSIGNMENT

```typescript
function autoAssignRoom(
  booking: { room_type_id: string; check_in: Date; check_out: Date; property_id: string },
  rooms: Room[],
  existingBookings: Booking[],
): Room | null {
  const candidates = rooms.filter(
    r => r.room_type_id === booking.room_type_id && r.active,
  );

  const available = candidates.filter(
    room => !existingBookings.some(
      b => b.room_id === room.id
        && !['cancelled', 'no_show'].includes(b.status)
        && b.check_in < booking.check_out
        && b.check_out > booking.check_in,
    ),
  );

  if (available.length === 0) return null;

  // Prefer least-recently-used room (spread wear evenly)
  return available.sort((a, b) => {
    const lastA = existingBookings
      .filter(bk => bk.room_id === a.id && bk.status !== 'cancelled')
      .reduce((latest, bk) => Math.max(latest, new Date(bk.check_out).getTime()), 0);
    const lastB = existingBookings
      .filter(bk => bk.room_id === b.id && bk.status !== 'cancelled')
      .reduce((latest, bk) => Math.max(latest, new Date(bk.check_out).getTime()), 0);
    return lastA - lastB;
  })[0];
}
```

---

## 8. API ROUTES

### Public (guest-facing)

```
GET    /api/properties/[slug]/rooms           → room types + photos + base prices
GET    /api/properties/[slug]/availability     → ?checkIn=&checkOut= → available rooms + calculated prices
POST   /api/properties/[slug]/bookings        → create booking → returns Stripe Checkout Session URL
GET    /api/bookings/[ref]                    → ?email= → guest self-service view
POST   /api/bookings/[ref]/cancel             → guest cancellation (validates policy + email)
POST   /api/webhooks/stripe                   → Stripe webhook handler
```

### Admin (Supabase Auth required)

```
GET    /api/admin/dashboard                   → today stats, arrivals, departures
GET    /api/admin/bookings                    → list + filter + search + paginate
GET    /api/admin/bookings/[id]               → full booking detail
POST   /api/admin/bookings                    → manual booking (walk-in, phone)
PATCH  /api/admin/bookings/[id]               → update status, assign room, add notes
DELETE /api/admin/bookings/[id]               → cancel + optional Stripe refund

GET    /api/admin/calendar                    → occupancy grid data (rooms × dates)

GET    /api/admin/guests                      → list + search
GET    /api/admin/guests/[id]                 → profile + booking history

CRUD   /api/admin/room-types                  → manage room types
CRUD   /api/admin/rooms                       → manage physical rooms
CRUD   /api/admin/pricing-rules               → manage pricing rules

GET    /api/admin/cleaning                    → ?date= → tasks for a day
PATCH  /api/admin/cleaning/[id]               → update status, assign

GET    /api/admin/reports/occupancy            → occupancy % by period
GET    /api/admin/reports/revenue              → revenue by period/type
GET    /api/admin/reports/sources              → booking sources breakdown

POST   /api/admin/invoices/[bookingId]        → generate + email invoice
POST   /api/admin/emails/resend/[logId]       → resend a failed email
```

---

## 9. GUEST BOOKING FLOW

1. Guest visits `/book/[property-slug]`
2. Selects check-in / check-out dates from calendar
3. System queries availability → shows room types with photos, prices per night, total, amenities
4. Guest picks a room type
5. Guest form: first name, last name, email, phone (optional), country, special requests, language toggle (no/en)
6. Booking summary: room, dates, per-night breakdown, total, cancellation policy
7. "Pay & Confirm" → `POST /api/properties/[slug]/bookings` → returns Stripe Checkout URL → redirect
8. Stripe Checkout (test mode) handles payment
9. Stripe webhook `checkout.session.completed` fires → system:
   - Sets booking status = `confirmed`, payment_status = `fully_paid`
   - Auto-assigns a physical room
   - Sends confirmation email (in guest's chosen language)
   - Creates cleaning task for check-out date
   - Updates guest profile totals
   - Sends admin notification email
10. Guest redirected to `/booking/[ref]?success=true` — shows confirmation with all details + self-service options

### Guest self-service (`/booking/[ref]`)
- Access: booking ref + email (link provided in confirmation email)
- View: all booking details, payment status, property contact info
- Cancel: if within cancellation policy deadline → Stripe refund → cancellation email → room freed

---

## 10. STRIPE INTEGRATION

### Prototype mode
All Stripe calls use **test/sandbox keys** (`sk_test_*`, `pk_test_*`). Use [Stripe test cards](https://docs.stripe.com/testing#cards):
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

### Checkout flow
```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  payment_method_types: ['card'],
  line_items: [{
    price_data: {
      currency: property.currency.toLowerCase(),
      unit_amount: totalPrice, // in øre
      product_data: {
        name: `${roomTypeName} — ${nights} nights`,
        description: `${format(checkIn, 'dd.MM.yyyy')} → ${format(checkOut, 'dd.MM.yyyy')}`,
      },
    },
    quantity: 1,
  }],
  metadata: {
    booking_id: booking.id,
    property_id: property.id,
  },
  success_url: `${appUrl}/booking/${bookingRef}?success=true`,
  cancel_url: `${appUrl}/book/${property.slug}?cancelled=true`,
  customer_email: guestEmail,
  locale: language === 'no' ? 'nb' : 'en',
});
```

### Webhook handler
```typescript
// POST /api/webhooks/stripe
export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  // CRITICAL: use the correct webhook secret for the environment
  const event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const bookingId = session.metadata.booking_id;
      // Update booking → confirmed + fully_paid
      // Auto-assign room
      // Send confirmation email
      // Create cleaning task
      break;
    }
    case 'charge.refunded': {
      // Update booking payment status
      // Send cancellation email
      break;
    }
  }
}
```

### Refund logic
```typescript
async function processRefund(booking: Booking, policy: CancellationPolicy) {
  const hoursUntilCheckin = differenceInHours(
    new Date(booking.check_in + 'T' + property.check_in_time),
    new Date(),
  );

  if (hoursUntilCheckin < policy.deadline_hours) {
    return { refundable: false, reason: 'Past cancellation deadline' };
  }

  const refundAmount = Math.round(booking.paid_amount * (policy.refund_pct / 100));

  if (refundAmount > 0 && booking.stripe_payment_intent_id) {
    await stripe.refunds.create({
      payment_intent: booking.stripe_payment_intent_id,
      amount: refundAmount,
    });
  }

  return { refundable: true, refundAmount };
}
```

### Migration note (test → live)
The ONLY changes needed to go live:
1. Replace `sk_test_*` → `sk_live_*` and `pk_test_*` → `pk_live_*` in env vars
2. Create a new webhook endpoint in Stripe dashboard pointing to production URL
3. Copy the new webhook signing secret to `STRIPE_WEBHOOK_SECRET`
4. No code changes. The `stripe` client reads keys from env.

---

## 11. EMAIL SYSTEM

### Templates (React Email + Resend)

```
/src/emails/
  booking-confirmation.tsx
  payment-receipt.tsx
  pre-arrival-reminder.tsx
  post-stay-thankyou.tsx
  cancellation-confirmation.tsx
  invoice-email.tsx
  admin-notification.tsx
  components/
    email-header.tsx            -- property logo + name (from DB, not hardcoded)
    email-footer.tsx            -- property contact info
    booking-detail-block.tsx    -- reusable booking summary
  i18n/
    no.ts                       -- Norwegian strings
    en.ts                       -- English strings
```

### All template content is parameterized
```typescript
// NO hardcoded property names anywhere in email templates
interface EmailProps {
  property: { name: string; logo_url: string; contact_email: string; contact_phone: string };
  booking: { ref: string; checkIn: string; checkOut: string; roomName: string; totalPrice: string };
  guest: { firstName: string; lastName: string };
  selfServiceUrl: string;
  language: 'no' | 'en';
}
```

### Resend integration
```typescript
import { Resend } from 'resend';

const resend = new Resend(env.RESEND_API_KEY);

async function sendBookingConfirmation(props: EmailProps) {
  const { data, error } = await resend.emails.send({
    from: `${props.property.name} <${env.EMAIL_FROM}>`,
    to: props.guest.email,
    subject: props.language === 'no'
      ? `Bekreftelse — ${props.booking.ref}`
      : `Confirmation — ${props.booking.ref}`,
    react: BookingConfirmationEmail(props),
  });

  // Log to email_log table (success or failure)
  await logEmail({ ...props, status: error ? 'failed' : 'sent', messageId: data?.id });
}
```

### Free-tier note
Resend free tier = 100 emails/day. For prototype/dev this is plenty. In production, upgrade to Pro ($20/mo = 50k emails/mo). The code doesn't change.

---

## 12. CRON JOBS

Defined in `vercel.json` (Vercel Cron). Each route validates a `CRON_SECRET` header.

```json
{
  "crons": [
    { "path": "/api/cron/reminders",  "schedule": "0 8 * * *"  },
    { "path": "/api/cron/thankyou",   "schedule": "0 10 * * *" },
    { "path": "/api/cron/cleaning",   "schedule": "0 5 * * *"  },
    { "path": "/api/cron/cleanup",    "schedule": "*/30 * * * *" }
  ]
}
```

| Job | Schedule | Action |
|-----|----------|--------|
| **Pre-arrival reminders** | Daily 08:00 UTC | Bookings with check_in = today + 2 → send reminder email |
| **Post-stay thank you** | Daily 10:00 UTC | Bookings with check_out = yesterday → send thank-you email |
| **Cleaning generation** | Daily 05:00 UTC | Bookings with check_out = today → create cleaning tasks |
| **Stale pending cleanup** | Every 30 min | Bookings with status `pending` older than 30 min → cancel + free room |

### Vercel Hobby cron limit
Hobby plan allows 2 cron jobs. Options:
- Combine into 1-2 super-crons that run all tasks
- Or use Supabase `pg_cron` extension (free tier supports it) for DB-level scheduling

**Recommended for prototype:** One combined cron at `/api/cron/daily` that runs reminders + thankyou + cleaning, plus one at `/api/cron/cleanup` for stale bookings. That's 2 crons, fits Hobby.

```json
{
  "crons": [
    { "path": "/api/cron/daily",   "schedule": "0 8 * * *"   },
    { "path": "/api/cron/cleanup", "schedule": "*/30 * * * *" }
  ]
}
```

---

## 13. ADMIN DASHBOARD

### Layout
- Sidebar: Dashboard, Bookings, Calendar, Guests, Rooms, Pricing, Cleaning, Reports, Settings
- Top bar: property name (from DB), user name, language toggle
- Responsive: must work on tablet (property owners use iPads at reception)

### Pages

**Dashboard (home)**
- Today's arrivals (guest, room, payment status)
- Today's departures (guest, room, cleaning status)
- Occupancy bar (occupied / total)
- This week mini-calendar
- Revenue this month vs last month
- Last 5 bookings with status badges

**Bookings**
- Table: ref, guest, room, dates, status badge, payment badge, source
- Filters: status, date range, room type, payment status
- Search: guest name, email, booking ref
- Click → detail page with full timeline + actions (cancel, refund, reassign room, add notes)
- Manual booking creation (walk-in / phone)

**Calendar**
- Grid: rooms (rows) × dates (columns), 2-week default view
- Color-coded blocks: confirmed (teal), checked-in (green), pending (yellow), blocked (gray)
- Click block → booking detail side panel

**Guests**
- List with search
- Profile: contact info, booking history, total spent, notes, language preference

**Rooms**
- Room types: CRUD with photo upload, amenities, pricing
- Physical rooms: CRUD, mapped to types, floor assignment

**Pricing**
- Base price per room type (editable inline)
- Pricing rules: CRUD with date pickers and day-of-week toggles
- Price preview tool: "Room X on Date Y = Z kr/night" (shows which rules applied)

**Cleaning**
- Daily view: room, task status, assigned to
- Tap to cycle: pending → in progress → done

**Reports**
- Occupancy: % by room type, by month, trend line
- Revenue: total, by type, by source, by month
- Booking sources: pie chart
- Date range picker on all
- CSV export button

**Settings**
- Property info: name, address, contact, logo, colors
- Check-in/check-out times
- Cancellation policies: CRUD
- Admin users: invite, set role/permissions

---

## 14. PROJECT STRUCTURE

```
guesthub/
├── src/
│   ├── app/
│   │   ├── (public)/                      # Guest-facing
│   │   │   ├── book/[slug]/
│   │   │   │   ├── page.tsx               # Booking flow entry
│   │   │   │   └── components/            # Date picker, room cards, guest form
│   │   │   └── booking/[ref]/
│   │   │       └── page.tsx               # Guest self-service
│   │   ├── admin/
│   │   │   ├── layout.tsx                 # Auth guard + sidebar
│   │   │   ├── page.tsx                   # Dashboard
│   │   │   ├── bookings/
│   │   │   ├── calendar/
│   │   │   ├── guests/
│   │   │   ├── rooms/
│   │   │   ├── pricing/
│   │   │   ├── cleaning/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   ├── api/
│   │   │   ├── properties/[slug]/
│   │   │   │   ├── rooms/route.ts
│   │   │   │   ├── availability/route.ts
│   │   │   │   └── bookings/route.ts
│   │   │   ├── bookings/[ref]/
│   │   │   │   ├── route.ts
│   │   │   │   └── cancel/route.ts
│   │   │   ├── webhooks/stripe/route.ts
│   │   │   ├── cron/
│   │   │   │   ├── daily/route.ts
│   │   │   │   └── cleanup/route.ts
│   │   │   └── admin/                     # All admin API routes
│   │   ├── login/page.tsx                 # Admin login
│   │   └── layout.tsx                     # Root layout
│   ├── components/
│   │   ├── booking/                       # Guest booking UI
│   │   ├── admin/                         # Admin dashboard UI
│   │   └── ui/                            # shadcn/ui
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts                 # Drizzle table definitions
│   │   │   ├── index.ts                  # DB client
│   │   │   └── seed.ts                   # Demo property seed
│   │   ├── pricing.ts                    # Pricing engine
│   │   ├── availability.ts              # Availability queries
│   │   ├── room-assignment.ts           # Auto-assign algorithm
│   │   ├── booking-ref.ts              # Ref generator: PREFIX-YEAR-SEQ
│   │   ├── stripe.ts                    # Stripe client + helpers
│   │   ├── email.ts                     # Resend client + send functions
│   │   ├── invoice.ts                   # PDF generation
│   │   ├── auth.ts                      # Supabase auth helpers
│   │   └── utils.ts                     # formatCurrency, date helpers
│   ├── emails/                           # React Email templates
│   │   ├── booking-confirmation.tsx
│   │   ├── payment-receipt.tsx
│   │   ├── pre-arrival-reminder.tsx
│   │   ├── post-stay-thankyou.tsx
│   │   ├── cancellation-confirmation.tsx
│   │   ├── admin-notification.tsx
│   │   ├── components/
│   │   └── i18n/
│   └── types/
│       └── index.ts
├── drizzle/
│   └── migrations/                       # Generated by drizzle-kit
├── public/
│   └── images/                           # Demo property photos
├── MIGRATION.md                          # Test → production checklist
├── drizzle.config.ts
├── vercel.json
├── .env.local                            # LOCAL ONLY — never commit
├── .env.example                          # Template with all required vars
├── package.json
└── tsconfig.json
```

---

## 15. ENVIRONMENT VARIABLES

```env
# ============================================
# .env.example — Copy to .env.local and fill in
# ============================================

# --- Supabase (Free tier for prototype) ---
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# --- Stripe (TEST/SANDBOX keys only for prototype) ---
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# --- Resend (Free tier for prototype) ---
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com

# --- App ---
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEFAULT_PROPERTY_SLUG=fjordview

# --- Cron auth ---
CRON_SECRET=generate-a-random-string

# ============================================
# MIGRATION NOTE:
# When deploying for a real client:
# 1. Create new Supabase Pro project → new URL + keys
# 2. Switch Stripe to live: sk_live_*, pk_live_*, new whsec_*
# 3. Upgrade Resend → verify client domain → update EMAIL_FROM
# 4. Set NEXT_PUBLIC_APP_URL to client's domain
# 5. Set DEFAULT_PROPERTY_SLUG to client's slug
# No code changes required.
# ============================================
```

---

## 16. SEED DATA — DEMO PROPERTY

The prototype ships with this fictional property. **Nothing here is a real business.**

```typescript
// src/lib/db/seed.ts

const demoProperty = {
  name: "Fjordview Lodge",
  slug: "fjordview",
  address: "Eksempelveien 42",
  city: "Demovik",
  postal_code: "0000",
  country: "NO",
  timezone: "Europe/Oslo",
  currency: "NOK",
  contact_email: "hello@fjordviewlodge.example",
  contact_phone: "+47 000 00 000",
  booking_ref_prefix: "FV",
  check_in_time: "15:00",
  check_out_time: "11:00",
  primary_color: "#0D9488",
  accent_color: "#F59E0B",
};

const demoRoomTypes = [
  {
    name: { no: "Dobbeltrom med eget bad", en: "Double room with private bathroom" },
    slug: "double-ensuite",
    has_bathroom: true,
    max_guests: 2,
    base_price: 129500, // 1295.00 NOK
    amenities: ["wifi", "tv", "private_bathroom", "towels", "linens", "desk"],
    sort_order: 1,
  },
  {
    name: { no: "Dobbeltrom uten bad", en: "Double room, shared bathroom" },
    slug: "double-shared",
    has_bathroom: false,
    max_guests: 2,
    base_price: 89500, // 895.00 NOK
    amenities: ["wifi", "tv", "shared_bathroom", "towels", "linens"],
    sort_order: 2,
  },
  {
    name: { no: "Enkeltrom", en: "Single room" },
    slug: "single",
    has_bathroom: false,
    max_guests: 1,
    base_price: 69500, // 695.00 NOK
    amenities: ["wifi", "tv", "shared_bathroom", "towels", "linens"],
    sort_order: 3,
  },
  {
    name: { no: "Familierom", en: "Family room" },
    slug: "family",
    has_bathroom: true,
    max_guests: 4,
    base_price: 179500, // 1795.00 NOK
    amenities: ["wifi", "tv", "private_bathroom", "towels", "linens", "extra_beds"],
    sort_order: 4,
  },
];

// 2-3 physical rooms per type
const demoRooms = [
  { room_number: "101", type_slug: "double-ensuite", floor: 1 },
  { room_number: "102", type_slug: "double-ensuite", floor: 1 },
  { room_number: "103", type_slug: "double-ensuite", floor: 1 },
  { room_number: "201", type_slug: "double-shared", floor: 2 },
  { room_number: "202", type_slug: "double-shared", floor: 2 },
  { room_number: "203", type_slug: "double-shared", floor: 2 },
  { room_number: "301", type_slug: "single", floor: 3 },
  { room_number: "302", type_slug: "single", floor: 3 },
  { room_number: "401", type_slug: "family", floor: 1 },
  { room_number: "402", type_slug: "family", floor: 1 },
];

const demoPricingRules = [
  {
    name: "Summer season",
    rule_type: "seasonal",
    modifier_pct: 25,
    start_date: "2026-06-15",
    end_date: "2026-08-15",
    priority: 1,
  },
  {
    name: "Weekend surcharge",
    rule_type: "day_of_week",
    modifier_pct: 15,
    days_of_week: [4, 5], // Fri, Sat
    priority: 2,
  },
  {
    name: "Christmas/New Year",
    rule_type: "seasonal",
    modifier_pct: 30,
    start_date: "2026-12-20",
    end_date: "2027-01-02",
    priority: 3,
  },
];

const demoCancellationPolicy = {
  name: "Standard",
  description: {
    no: "Gratis avbestilling inntil 48 timer før innsjekk. Etter fristen belastes hele beløpet.",
    en: "Free cancellation up to 48 hours before check-in. After the deadline, the full amount is charged.",
  },
  refund_pct: 100,
  deadline_hours: 48,
  is_default: true,
};

const demoAdmin = {
  email: "admin@example.com",      // developer's email for prototype testing
  name: "Demo Admin",
  role: "owner",
};
```

---

## 17. DEVELOPMENT PHASES

### Phase 1 — Foundation (Days 1-3)
- [ ] `npx create-next-app` with App Router + TypeScript + Tailwind
- [ ] Install: `drizzle-orm`, `drizzle-kit`, `@supabase/supabase-js`, `@supabase/ssr`, `stripe`, `resend`, `react-email`, `date-fns`, `zod`
- [ ] shadcn/ui init + install core components (button, card, input, dialog, table, badge, calendar, dropdown-menu, tabs, toast)
- [ ] Drizzle schema matching Section 4, generate + push migrations to Supabase
- [ ] Seed script (`pnpm seed`) that populates demo property
- [ ] Supabase Auth setup: admin login page, middleware for `/admin/*` routes
- [ ] `.env.example` with all vars documented
- [ ] `MIGRATION.md` with full test→production checklist

### Phase 2 — Booking Engine (Days 4-8)
- [ ] Availability API with pricing engine
- [ ] Guest booking flow UI: date picker → room cards → guest form → summary
- [ ] Stripe Checkout session creation
- [ ] Stripe webhook handler (checkout.session.completed, charge.refunded)
- [ ] Booking ref generator (PREFIX-YEAR-SEQ)
- [ ] Room auto-assignment on confirmation
- [ ] Success page with booking details

### Phase 3 — Emails + Guest Self-Service (Days 9-13)
- [ ] React Email templates: confirmation, cancellation (NO + EN)
- [ ] Resend send functions with email_log tracking
- [ ] Guest self-service page: view booking details
- [ ] Guest cancellation flow: policy check → Stripe refund → email → room freed
- [ ] Admin notification on new booking
- [ ] Pre-arrival reminder + post-stay thank-you templates

### Phase 4 — Admin Dashboard (Days 14-18)
- [ ] Admin layout with sidebar + responsive
- [ ] Dashboard home: arrivals, departures, occupancy, revenue, recent bookings
- [ ] Bookings: list, detail, manual creation, cancel/refund
- [ ] Calendar: room × date occupancy grid
- [ ] Guests: list, profile
- [ ] Rooms: room type CRUD + physical room CRUD + photo upload
- [ ] Pricing: rule CRUD + price preview tool
- [ ] Cleaning: daily task list with status cycling

### Phase 5 — Reports + Polish (Days 19-21)
- [ ] Occupancy + revenue + source reports with charts (Recharts)
- [ ] CSV export
- [ ] Invoice PDF generation
- [ ] Cron jobs (combined daily + stale cleanup)
- [ ] Loading states, empty states, error boundaries
- [ ] Mobile responsive pass on admin
- [ ] Input validation (Zod on all API routes)
- [ ] RLS policy verification
- [ ] Rate limiting on public endpoints

---

## 18. CRITICAL RULES FOR DEVELOPER AGENTS

1. **No client names in code.** Not in comments, not in variable names, not in test fixtures. Everything client-specific comes from the `properties` table or env vars.

2. **All prices in smallest currency unit.** Store as integers. Display with `formatCurrency()` helper. Never use floating point for money.

3. **Every DB query includes `property_id`.** No exceptions. Test by adding a second demo property and verifying zero data leakage.

4. **Stripe keys come from env only.** Never hardcode. Never log. The same code must work with `sk_test_*` and `sk_live_*` without changes.

5. **Webhook signature verification is mandatory.** Never skip it, even in development. Use Stripe CLI for local webhook testing.

6. **Email templates are parameterized.** Property name, logo, colors, contact info — all from the database. Never hardcode.

7. **Test on free tiers.** Don't use features that require Supabase Pro or Vercel Pro. If a feature needs a paid tier, document it clearly and gate it behind an env flag.

8. **Norwegian locale matters.** Dates: DD.MM.YYYY. Currency: 1 234,56 kr. Time: 24-hour. Day names: mandag–søndag. The `date-fns/locale/nb` locale handles most of this.

9. **Two languages, not one.** Every guest-facing string supports `no` and `en`. Use JSONB fields in DB and `i18n` files in email templates. The admin UI can be English-only for the prototype.

10. **Git hygiene.** `.env.local` in `.gitignore`. Commit `.env.example` with placeholder values. Never commit real keys.

---

## 19. ACCEPTANCE CRITERIA (prototype demo-ready)

- [ ] Guest can browse rooms and see availability for selected dates
- [ ] Prices reflect base + seasonal + day-of-week rules correctly
- [ ] Guest completes booking → pays via Stripe test checkout → gets confirmation email
- [ ] Confirmation email renders in both Norwegian and English
- [ ] Guest can view booking via self-service link (ref + email)
- [ ] Guest can cancel within policy → Stripe refund issued → cancellation email sent
- [ ] Admin logs in → dashboard shows arrivals, departures, occupancy, revenue
- [ ] Admin can list, filter, search bookings
- [ ] Admin can create a manual booking (walk-in)
- [ ] Admin sees occupancy calendar (rooms × dates grid)
- [ ] Admin can manage room types and physical rooms
- [ ] Admin can add/edit pricing rules and preview effective price
- [ ] Admin sees cleaning tasks for today
- [ ] Admin can view occupancy and revenue reports
- [ ] All data scoped to property_id (add second demo property, verify isolation)
- [ ] Booking flow works on mobile phone
- [ ] Admin dashboard works on tablet
- [ ] No hardcoded property names, colors, or contact info anywhere in code
- [ ] `.env.example` and `MIGRATION.md` are complete and accurate
