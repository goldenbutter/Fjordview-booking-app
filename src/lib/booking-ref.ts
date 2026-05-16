export function createBookingRef(prefix: string, sequence: number, date = new Date()) {
  return `${prefix}-${date.getFullYear()}-${String(sequence).padStart(4, "0")}`;
}
