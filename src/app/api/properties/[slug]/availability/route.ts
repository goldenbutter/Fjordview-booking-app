import { NextResponse } from "next/server";
import { getAvailableRoomTypes } from "@/lib/availability";
import { demoProperty } from "@/lib/db/seed";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const limit = checkRateLimit(rateLimitKey(request, "availability"), 60);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many availability requests" }, { status: 429 });
  }

  const { slug } = await params;
  if (slug !== demoProperty.slug) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");

  if (!checkIn || !checkOut || checkOut <= checkIn) {
    return NextResponse.json(
      { error: "Valid checkIn and checkOut dates are required" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    property: demoProperty,
    rooms: getAvailableRoomTypes(demoProperty.id, checkIn, checkOut),
  });
}
