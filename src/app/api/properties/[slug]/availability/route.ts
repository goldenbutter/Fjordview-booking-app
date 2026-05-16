import { NextResponse } from "next/server";
import { getAvailableRoomTypes } from "@/lib/availability";
import { demoProperty } from "@/lib/db/seed";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
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
