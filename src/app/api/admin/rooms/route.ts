import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdminContext } from "@/lib/admin-context";
import { createRoom, deleteRoom, getAdminSnapshotForProperty, updateRoom } from "@/lib/db/queries";

const roomPayload = z.object({
  roomTypeId: z.string().uuid(),
  roomNumber: z.string().min(1).max(24),
  floor: z.number().int().min(-10).max(200).default(0),
  notes: z.string().optional(),
  active: z.boolean().default(true),
});

const updatePayload = roomPayload.partial().extend({
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

async function roomTypeBelongsToProperty(propertyId: string, roomTypeId: string) {
  const snapshot = await getAdminSnapshotForProperty(propertyId);
  return snapshot?.roomTypes.some((roomType) => roomType.id === roomTypeId) ?? false;
}

export async function POST(request: Request) {
  const scoped = await getPropertyOr404();
  if ("response" in scoped) return scoped.response;

  const parsed = roomPayload.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (!(await roomTypeBelongsToProperty(scoped.property.id, parsed.data.roomTypeId))) {
    return NextResponse.json({ error: "Room type not found" }, { status: 404 });
  }

  try {
    const room = await createRoom({ ...parsed.data, propertyId: scoped.property.id });
    return NextResponse.json({ room }, { status: 201 });
  } catch (err) {
    console.error("[admin.rooms.POST]", err);
    return NextResponse.json({ error: "Could not create room" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const scoped = await getPropertyOr404();
  if ("response" in scoped) return scoped.response;

  const parsed = updatePayload.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (
    parsed.data.roomTypeId &&
    !(await roomTypeBelongsToProperty(scoped.property.id, parsed.data.roomTypeId))
  ) {
    return NextResponse.json({ error: "Room type not found" }, { status: 404 });
  }

  try {
    const room = await updateRoom({ ...parsed.data, propertyId: scoped.property.id });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    return NextResponse.json({ room });
  } catch (err) {
    console.error("[admin.rooms.PATCH]", err);
    return NextResponse.json({ error: "Could not update room" }, { status: 500 });
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
      const hasBookings = snapshot?.recentBookings.some((booking) => booking.roomId === parsed.data.id) ?? false;
      if (hasBookings) {
        return NextResponse.json(
          { error: "Cannot delete a room with booking history. Deactivate it instead." },
          { status: 409 },
        );
      }
    }

    const room = parsed.data.hardDelete
      ? await deleteRoom(scoped.property.id, parsed.data.id)
      : await updateRoom({ id: parsed.data.id, propertyId: scoped.property.id, active: false });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    return NextResponse.json({ room });
  } catch (err) {
    console.error("[admin.rooms.DELETE]", err);
    return NextResponse.json({ error: "Could not delete room" }, { status: 500 });
  }
}
