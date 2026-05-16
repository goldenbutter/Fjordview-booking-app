import { NextResponse } from "next/server";
import { propertySlugSchema, validationError } from "@/lib/api-validation";
import { getActiveRoomTypes, getPropertyBySlug } from "@/lib/db/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const parsedSlug = propertySlugSchema.safeParse(slug);
  if (!parsedSlug.success) {
    return NextResponse.json(validationError("Invalid property slug"), { status: 400 });
  }

  const property = await getPropertyBySlug(slug);
  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const roomTypes = await getActiveRoomTypes(property.id);
  return NextResponse.json({ property, roomTypes });
}
