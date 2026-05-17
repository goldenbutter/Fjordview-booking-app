import type { Booking, Guest, Property, RoomType } from "@/types";
import { formatCurrency, formatDate, humanizeEnum, nightsBetween } from "@/lib/utils";

const VAT_RATE = 0.12;

export function createInvoiceText(input: {
  property: Property;
  booking: Booking;
  guest: Guest;
  roomType: RoomType;
}) {
  return [
    `Invoice - ${input.booking.bookingRef}`,
    input.property.name,
    `${input.property.address}, ${input.property.city}`,
    "",
    `Guest: ${input.guest.firstName} ${input.guest.lastName}`,
    `Room: ${input.roomType.name.en}`,
    `Stay: ${formatDate(input.booking.checkIn)} - ${formatDate(input.booking.checkOut)}`,
    `Total: ${formatCurrency(input.booking.totalPrice, input.booking.currency)}`,
  ].join("\n");
}

export function createInvoicePdf(input: {
  property: Property;
  booking: Booking;
  guest: Guest;
  roomType: RoomType;
}) {
  return createProfessionalInvoicePdf(input);
}

function createProfessionalInvoicePdf(input: {
  property: Property;
  booking: Booking;
  guest: Guest;
  roomType: RoomType;
}) {
  const { property, booking, guest, roomType } = input;
  const nights = Math.max(1, nightsBetween(booking.checkIn, booking.checkOut));
  const subtotalExVat = Math.round(booking.totalPrice / (1 + VAT_RATE));
  const vat = booking.totalPrice - subtotalExVat;
  const issuedDate = booking.createdAt ? formatDate(booking.createdAt) : formatDate(new Date());
  const nightRows = invoiceNightRows(booking.checkIn, nights, booking.totalPrice);

  const content = [
    rect(0, 0, 595, 842, "0.96 0.98 1"),
    rect(70, 786, 455, 5, rgb(property.primaryColor, "0 0.58 0.52")),
    text(property.name, 70, 740, 24, "F2", "0.02 0.04 0.10"),
    text(`${property.address}, ${property.postalCode} ${property.city}, ${property.country}`, 70, 720, 10, "F1", "0.33 0.40 0.50"),
    text(`${property.contactEmail}${property.contactPhone ? ` | ${property.contactPhone}` : ""}`, 70, 705, 10, "F1", "0.33 0.40 0.50"),
    text("INVOICE", 454, 742, 10, "F2", rgb(property.primaryColor, "0 0.45 0.40")),
    text(booking.bookingRef, 380, 720, 21, "F2", "0.02 0.04 0.10"),
    text(`Issued ${issuedDate}`, 425, 699, 10, "F1", "0.40 0.45 0.55"),
    line(70, 678, 525, 678, "0.82 0.86 0.91"),

    text("BILLED TO", 70, 648, 9, "F2", "0.38 0.45 0.56"),
    text(`${guest.firstName} ${guest.lastName}`, 70, 628, 13, "F2", "0.02 0.04 0.10"),
    text(guest.email, 70, 611, 10, "F1", "0.22 0.28 0.38"),
    ...(guest.phone ? [text(guest.phone, 70, 596, 10, "F1", "0.22 0.28 0.38")] : []),
    ...(guest.country ? [text(guest.country, 70, guest.phone ? 581 : 596, 10, "F1", "0.22 0.28 0.38")] : []),

    text("STAY", 315, 648, 9, "F2", "0.38 0.45 0.56"),
    text(`${formatDate(booking.checkIn)} - ${formatDate(booking.checkOut)}`, 315, 628, 13, "F2", "0.02 0.04 0.10"),
    text(`${nights} night${nights === 1 ? "" : "s"} | ${booking.guestCount} guest${booking.guestCount === 1 ? "" : "s"}`, 315, 611, 10, "F1", "0.22 0.28 0.38"),
    text(roomType.name.en, 315, 596, 10, "F1", "0.22 0.28 0.38"),

    line(70, 555, 525, 555, "0.82 0.86 0.91"),
    text("DATE", 80, 535, 9, "F2", "0.38 0.45 0.56"),
    text("DESCRIPTION", 190, 535, 9, "F2", "0.38 0.45 0.56"),
    text("AMOUNT", 465, 535, 9, "F2", "0.38 0.45 0.56"),
    line(70, 520, 525, 520, "0.82 0.86 0.91"),
    ...nightRows.flatMap((row, index) => {
      const y = 495 - index * 30;
      return [
        text(formatDate(row.date), 80, y, 10, "F1", "0.22 0.28 0.38"),
        text(roomType.name.en, 190, y, 10, "F1", "0.22 0.28 0.38"),
        text(formatCurrency(row.amount, booking.currency), 455, y, 10, "F2", "0.02 0.04 0.10"),
        line(70, y - 16, 525, y - 16, "0.90 0.93 0.96"),
      ];
    }),
    text("SUBTOTAL (EX. VAT)", 315, 345, 9, "F1", "0.38 0.45 0.56"),
    text(formatCurrency(subtotalExVat, booking.currency), 455, 345, 10, "F1", "0.22 0.28 0.38"),
    text("VAT (MVA) 12%", 315, 325, 9, "F1", "0.38 0.45 0.56"),
    text(formatCurrency(vat, booking.currency), 455, 325, 10, "F1", "0.22 0.28 0.38"),
    text("Total", 315, 295, 13, "F2", "0.02 0.04 0.10"),
    text(formatCurrency(booking.totalPrice, booking.currency), 445, 295, 13, "F2", "0.02 0.04 0.10"),

    rect(70, 230, 455, 50, "0.94 0.97 0.99"),
    text("PAYMENT STATUS", 85, 260, 9, "F2", "0.38 0.45 0.56"),
    text(humanizeEnum(booking.paymentStatus), 85, 242, 13, "F2", "0.02 0.04 0.10"),
    rect(426, 246, 82, 18, "0.86 0.98 0.92"),
    text(`${formatCurrency(booking.paidAmount, booking.currency)} paid`, 435, 251, 9, "F2", "0 0.43 0.25"),

    line(70, 190, 525, 190, "0.82 0.86 0.91"),
    text("Cancellation", 70, 165, 10, "F2", "0.22 0.28 0.38"),
    text(property.cancellationInfo.en, 70, 148, 9, "F1", "0.38 0.45 0.56"),
    text(`Thank you for staying at ${property.name}. Questions? Contact ${property.contactEmail}.`, 70, 118, 9, "F1", "0.38 0.45 0.56"),
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}

function invoiceNightRows(checkIn: string, nights: number, totalPrice: number) {
  const base = Math.floor(totalPrice / nights);
  const remainder = totalPrice - base * nights;
  return Array.from({ length: nights }, (_, index) => ({
    date: addDaysIso(checkIn, index),
    amount: base + (index === nights - 1 ? remainder : 0),
  }));
}

function addDaysIso(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function text(value: string, x: number, y: number, size: number, font: "F1" | "F2", color: string) {
  return `BT\n${color} rg\n/${font} ${size} Tf\n${x} ${y} Td\n(${escapePdfText(value)}) Tj\nET`;
}

function rect(x: number, y: number, width: number, height: number, color: string) {
  return `q\n${color} rg\n${x} ${y} ${width} ${height} re\nf\nQ`;
}

function line(x1: number, y1: number, x2: number, y2: number, color: string) {
  return `q\n${color} RG\n0.8 w\n${x1} ${y1} m\n${x2} ${y2} l\nS\nQ`;
}

function rgb(hex: string | undefined, fallback: string) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
  if (!match) return fallback;
  const value = match[1];
  return [0, 2, 4]
    .map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255)
    .map((channel) => trimNumber(channel))
    .join(" ");
}

function trimNumber(value: number) {
  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function escapePdfText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}
