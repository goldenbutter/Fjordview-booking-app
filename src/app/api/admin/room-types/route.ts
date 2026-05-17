import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdminContext } from "@/lib/admin-context";
import { createRoomType, deleteRoomType, getAdminSnapshotForProperty, updateRoomType } from "@/lib/db/queries";

const roomTypePayload = z.object({
  name: z.object({
    en: z.string().min(1),
    no: z.string().min(1),
  }),
  description: z.object({
    en: z.string().default(""),
    no: z.string().default(""),
  }),
  slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  hasBathroom: z.boolean().default(false),
  maxGuests: z.number().int().min(1).max(20),
  basePrice: z.number().int().nonnegative(),
  amenities: z.array(z.string().min(1)).default([]),
  photoUrls: z.array(z.string().url()).default([]),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

const updatePayload = roomTypePayload.partial().extend({
  id: z.string().uuid(),
});

const deletePayload = z.object({
  id: z.string().uuid(),
  hardDelete: z.boolean().default(false),
});

async function getPropertyOr404() {
  const context = await getCurrentAdminContext();
  const property = context?.property;
  if (!property) {
    return { response: NextResponse.json({ error: "Property not found" }, { status: 404 }) };
  }
  return { property };
}

export async function POST(request: Request) {
  const scoped = await getPropertyOr404();
  if ("response" in scoped) return scoped.response;

  const parsed = roomTypePayload.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const roomType = await createRoomType({ ...parsed.data, propertyId: scoped.property.id });
    return NextResponse.json({ roomType }, { status: 201 });
  } catch (err) {
    console.error("[admin.room-types.POST]", err);
    return NextResponse.json({ error: "Could not create room type" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const scoped = await getPropertyOr404();
  if ("response" in scoped) return scoped.response;

  const parsed = updatePayload.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const roomType = await updateRoomType({ ...parsed.data, propertyId: scoped.property.id });
    if (!roomType) {
      return NextResponse.json({ error: "Room type not found" }, { status: 404 });
    }
    return NextResponse.json({ roomType });
  } catch (err) {
    console.error("[admin.room-types.PATCH]", err);
    return NextResponse.json({ error: "Could not update room type" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const scoped = await getPropertyOr404();
  if ("response" in scoped) return scoped.response;

  const parsed = deletePayload.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    if (parsed.data.hardDelete) {
      const snapshot = await getAdminSnapshotForProperty(scoped.property.id);
      const hasRooms = snapshot?.rooms.some((room) => room.roomTypeId === parsed.data.id) ?? false;
      const hasBookings = snapshot?.recentBookings.some((booking) => booking.roomTypeId === parsed.data.id) ?? false;
      if (hasRooms || hasBookings) {
        return NextResponse.json(
          { error: "Cannot delete a room type with rooms or booking history. Deactivate it instead." },
          { status: 409 },
        );
      }
    }

    const roomType = parsed.data.hardDelete
      ? await deleteRoomType(scoped.property.id, parsed.data.id)
      : await updateRoomType({ id: parsed.data.id, propertyId: scoped.property.id, active: false });
    if (!roomType) {
      return NextResponse.json({ error: "Room type not found" }, { status: 404 });
    }
    return NextResponse.json({ roomType });
  } catch (err) {
    console.error("[admin.room-types.DELETE]", err);
    return NextResponse.json({ error: "Could not delete room type" }, { status: 500 });
  }
}
