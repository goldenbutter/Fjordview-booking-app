import { Section, Text } from "@react-email/components";
import type { EmailCopy } from "../i18n";
import type { EmailTemplateProps } from "../types";
import type { Locale } from "@/types";

function formatDate(value: string, language: Locale) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat(language === "no" ? "nb-NO" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatMoney(amount: number, currency: string, language: Locale) {
  return new Intl.NumberFormat(language === "no" ? "nb-NO" : "en-US", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

export function BookingDetailBlock({
  copy,
  language,
  props,
}: {
  copy: EmailCopy;
  language: Locale;
  props: EmailTemplateProps;
}) {
  const roomName = props.roomType.name[language] ?? props.roomType.name.en;
  const rows = [
    [copy.labels.bookingRef, props.booking.bookingRef],
    [copy.labels.guest, `${props.guest.firstName} ${props.guest.lastName}`],
    [copy.labels.room, roomName],
    [copy.labels.checkIn, formatDate(props.booking.checkIn, language)],
    [copy.labels.checkOut, formatDate(props.booking.checkOut, language)],
    [copy.labels.guests, String(props.booking.guestCount)],
    [copy.labels.total, formatMoney(props.booking.totalPrice, props.booking.currency, language)],
    [copy.labels.paid, formatMoney(props.booking.paidAmount, props.booking.currency, language)],
  ];

  return (
    <Section style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "18px" }}>
      {rows.map(([label, value]) => (
        <Text key={label} style={{ color: "#0f172a", fontSize: "14px", lineHeight: "22px", margin: "0 0 8px" }}>
          <strong>{label}:</strong> {value}
        </Text>
      ))}
    </Section>
  );
}
