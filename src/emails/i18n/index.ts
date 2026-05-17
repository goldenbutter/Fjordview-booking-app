import { en } from "./en";
import { no } from "./no";
import type { EmailType } from "../types";
import type { Locale } from "@/types";

export type EmailCopy = {
  subjects: Record<EmailType, (ref: string) => string>;
  preview: Record<EmailType, string>;
  intro: Record<EmailType, string>;
  labels: {
    bookingRef: string;
    guest: string;
    room: string;
    stay: string;
    checkIn: string;
    checkOut: string;
    guests: string;
    total: string;
    paid: string;
    selfService: string;
    contact: string;
  };
  actions: {
    viewBooking: string;
    viewInvoice: string;
  };
  footer: string;
};

const copies: Record<Locale, EmailCopy> = { no, en };

export function getEmailCopy(language: Locale): EmailCopy {
  return copies[language] ?? en;
}
