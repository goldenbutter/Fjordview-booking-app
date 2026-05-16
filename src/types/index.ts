export type Locale = "no" | "en";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show";

export type PaymentStatus =
  | "unpaid"
  | "deposit_paid"
  | "fully_paid"
  | "refunded"
  | "partial_refund";

export type Property = {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  timezone: string;
  currency: string;
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  contactEmail: string;
  contactPhone: string;
  bookingRefPrefix: string;
  checkInTime: string;
  checkOutTime: string;
  cancellationInfo: Record<Locale, string>;
};

export type RoomType = {
  id: string;
  propertyId: string;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  slug: string;
  hasBathroom: boolean;
  maxGuests: number;
  basePrice: number;
  amenities: string[];
  photoUrls: string[];
  sortOrder: number;
  active: boolean;
};

export type Room = {
  id: string;
  propertyId: string;
  roomTypeId: string;
  roomNumber: string;
  floor: number;
  notes?: string;
  active: boolean;
};

export type PricingRule = {
  id: string;
  propertyId: string;
  roomTypeId?: string;
  name: string;
  ruleType: "seasonal" | "day_of_week" | "special";
  priceOverride?: number;
  modifierPct?: number;
  startDate?: string;
  endDate?: string;
  daysOfWeek?: number[];
  priority: number;
  active: boolean;
};

export type Guest = {
  id: string;
  propertyId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  country?: string;
  language: Locale;
  totalBookings: number;
  totalSpent: number;
};

export type Booking = {
  id: string;
  propertyId: string;
  roomId?: string;
  roomTypeId: string;
  guestId: string;
  bookingRef: string;
  status: BookingStatus;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  totalPrice: number;
  currency: string;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  specialRequests?: string;
  source: "direct" | "admin" | "api" | "channel";
  language: Locale;
  createdAt: string;
};

export type CancellationPolicy = {
  id: string;
  propertyId: string;
  name: string;
  description: Record<Locale, string>;
  refundPct: number;
  deadlineHours: number;
  isDefault: boolean;
  active: boolean;
};

export type CleaningTask = {
  id: string;
  propertyId: string;
  roomId: string;
  bookingId?: string;
  taskDate: string;
  status: "pending" | "in_progress" | "completed";
  assignedTo?: string;
  notes?: string;
};

export type PriceBreakdown = {
  nights: { date: string; price: number; appliedRule?: string }[];
  subtotal: number;
  currency: string;
};
