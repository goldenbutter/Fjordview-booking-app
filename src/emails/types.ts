import type { Booking, Guest, Locale, Property, RoomType } from "@/types";

export type EmailType =
  | "confirmation"
  | "receipt"
  | "reminder"
  | "thank_you"
  | "cancellation"
  | "invoice"
  | "admin_notification"
  | "admin_cancellation";

export type EmailTemplateProps = {
  property: Property;
  booking: Booking;
  guest: Guest;
  roomType: RoomType;
  selfServiceUrl: string;
  language?: Locale;
};

export function templateLanguage(props: EmailTemplateProps): Locale {
  return props.language ?? props.booking.language;
}
