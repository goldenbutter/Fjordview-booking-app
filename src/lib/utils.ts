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

export function nightsBetween(checkIn: string, checkOut: string) {
  const start = parseISO(checkIn);
  const end = parseISO(checkOut);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
}
