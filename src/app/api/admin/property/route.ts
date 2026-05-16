import { NextResponse } from "next/server";
import { z } from "zod";
import { getPropertyBySlug, updateProperty } from "@/lib/db/queries";
import { env } from "@/lib/env";

const schema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  checkInTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  checkOutTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function PATCH(request: Request) {
  const property = await getPropertyBySlug(env.defaultPropertySlug);
  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const updated = await updateProperty(property.id, parsed.data);
  return NextResponse.json({ property: updated });
}
