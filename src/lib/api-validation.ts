import { z } from "zod";

export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const propertySlugSchema = z.string().min(1).max(80).regex(/^[a-z0-9-]+$/);
export const bookingRefSchema = z.string().min(6).max(40).regex(/^[A-Z0-9-]+$/);

export function validationError(message = "Invalid request") {
  return { error: message };
}
