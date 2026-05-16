import { NextResponse } from "next/server";
import { propertySlugSchema, validationError } from "@/lib/api-validation";
import { demoProperty, demoRoomTypes } from "@/lib/db/seed";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const parsedSlug = propertySlugSchema.safeParse(slug);
  if (!parsedSlug.success) {
    return NextResponse.json(validationError("Invalid property slug"), { status: 400 });
  }

  if (slug !== demoProperty.slug) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  return NextResponse.json({
    property: demoProperty,
    roomTypes: demoRoomTypes.filter((roomType) => roomType.active),
  });
}
