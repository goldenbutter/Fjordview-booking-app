import { NextResponse } from "next/server";
import { z } from "zod";
import { dateStringSchema, validationError } from "@/lib/api-validation";
import { getCurrentAdminContext } from "@/lib/admin-context";
import { getCalendarData } from "@/lib/db/queries";

const calendarQuerySchema = z
  .object({
    start: dateStringSchema,
    end: dateStringSchema,
  })
  .refine((value) => value.end > value.start, {
    message: "end must be after start",
  });

function defaultRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + 14);
  return {
    start: today.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { start: defaultStart, end: defaultEnd } = defaultRange();
  const parsedQuery = calendarQuerySchema.safeParse({
    start: searchParams.get("start") ?? defaultStart,
    end: searchParams.get("end") ?? defaultEnd,
  });
  if (!parsedQuery.success) {
    return NextResponse.json(validationError("Valid start and end dates are required"), { status: 400 });
  }
  const { start, end } = parsedQuery.data;

  const context = await getCurrentAdminContext();
  const property = context?.property;
  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const { rooms, bookings } = await getCalendarData(property.id, start, end);
  return NextResponse.json({ rooms, bookings, start, end });
}
