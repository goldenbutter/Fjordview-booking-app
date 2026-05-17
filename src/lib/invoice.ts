import type { Booking, Guest, Property, RoomType } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

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
    "",
    "Prototype invoice text. Production can replace this with a PDF renderer.",
  ].join("\n");
}

export function createInvoicePdf(input: {
  property: Property;
  booking: Booking;
  guest: Guest;
  roomType: RoomType;
}) {
  const lines = createInvoiceText(input)
    .split("\n")
    .filter((line) => line.trim().length > 0);
  return createSimplePdf(lines);
}

function createSimplePdf(lines: string[]) {
  const content = [
    "BT",
    "/F1 18 Tf",
    "72 760 Td",
    ...lines.flatMap((line, index) => {
      const fontSize = index === 0 ? 18 : 11;
      const leading = index === 0 ? -34 : -18;
      return [
        `/F1 ${fontSize} Tf`,
        `(${escapePdfText(line)}) Tj`,
        `0 ${leading} Td`,
      ];
    }),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
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

function escapePdfText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}
