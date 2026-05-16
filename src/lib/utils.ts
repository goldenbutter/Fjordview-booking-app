import { clsx, type ClassValue } from "clsx";
import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "NOK") {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

export function formatDate(date: string | Date) {
  const value = typeof date === "string" ? parseISO(date) : date;
  return format(value, "dd.MM.yyyy", { locale: nb });
}

export function formatShortDate(date: string | Date) {
  const value = typeof date === "string" ? parseISO(date) : date;
  return format(value, "dd. MMM", { locale: nb });
}

export function formatInputDate(isoDate: string) {
  if (!isoDate) return "";
  return format(parseISO(isoDate), "dd.MM.yyyy", { locale: nb });
}

export function parseInputDate(displayDate: string) {
  const match = displayDate.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }
  return format(date, "yyyy-MM-dd");
}

export function nightsBetween(checkIn: string, checkOut: string) {
  const start = parseISO(checkIn);
  const end = parseISO(checkOut);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
}
