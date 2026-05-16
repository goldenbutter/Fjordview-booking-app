import { NextResponse } from "next/server";
import { demoProperty, demoRoomTypes } from "@/lib/db/seed";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (slug !== demoProperty.slug) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  return NextResponse.json({
    property: demoProperty,
    roomTypes: demoRoomTypes.filter((roomType) => roomType.active),
  });
}
