import { NextResponse } from "next/server";
import { z } from "zod";
import { dateStringSchema, propertySlugSchema, validationError } from "@/lib/api-validation";
import { getAvailability, getPropertyBySlug } from "@/lib/db/queries";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

const availabilityQuerySchema = z
  .object({
    checkIn: dateStringSchema,
    checkOut: dateStringSchema,
  })
  .refine((value) => value.checkOut > value.checkIn, {
    message: "checkOut must be after checkIn",
  });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const limit = checkRateLimit(rateLimitKey(request, "availability"), 60);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many availability requests" }, { status: 429 });
  }

  const { slug } = await params;
  const parsedSlug = propertySlugSchema.safeParse(slug);
  if (!parsedSlug.success) {
    return NextResponse.json(validationError("Invalid property slug"), { status: 400 });
  }

  const property = await getPropertyBySlug(slug);
  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = availabilityQuerySchema.safeParse({
    checkIn: searchParams.get("checkIn"),
    checkOut: searchParams.get("checkOut"),
  });
  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "Valid checkIn and checkOut dates are required" },
      { status: 400 },
    );
  }
  const { checkIn, checkOut } = parsedQuery.data;

  const rooms = await getAvailability(property.id, checkIn, checkOut);
  return NextResponse.json({ property, rooms });
}
