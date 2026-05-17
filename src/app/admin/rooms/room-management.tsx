"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bath, BedDouble, Edit, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, SelectInput, TextArea, TextInput } from "@/components/ui/field";
import type { AdminBookingRow } from "@/lib/db/queries";
import { formatCurrency } from "@/lib/utils";
import type { Locale, Room, RoomType } from "@/types";

type Props = {
  roomTypes: RoomType[];
  rooms: Room[];
  bookings: AdminBookingRow[];
};

type RoomTypeFormState = {
  id?: string;
  nameEn: string;
  nameNo: string;
  descriptionEn: string;
  descriptionNo: string;
  slug: string;
  basePriceNok: string;
  maxGuests: string;
  hasBathroom: boolean;
  amenities: string;
  sortOrder: string;
  active: boolean;
};

type RoomFormState = {
  id?: string;
  roomTypeId: string;
  roomNumber: string;
  floor: string;
  notes: string;
  active: boolean;
};

const emptyRoomType: RoomTypeFormState = {
  nameEn: "",
  nameNo: "",
  descriptionEn: "",
  descriptionNo: "",
  slug: "",
  basePriceNok: "",
  maxGuests: "2",
  hasBathroom: false,
  amenities: "",
  sortOrder: "0",
  active: true,
};

function emptyRoom(roomTypes: RoomType[]): RoomFormState {
  return {
    roomTypeId: roomTypes[0]?.id ?? "",
    roomNumber: "",
    floor: "0",
    notes: "",
    active: true,
  };
}

export function RoomManagement({ roomTypes, rooms, bookings }: Props) {
  const router = useRouter();
  const [roomTypeForm, setRoomTypeForm] = useState<RoomTypeFormState>(emptyRoomType);
  const [roomForm, setRoomForm] = useState<RoomFormState>(() => emptyRoom(roomTypes));
  const [loadingKey, setLoadingKey] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const roomTypeNameById = useMemo(
    () => new Map(roomTypes.map((roomType) => [roomType.id, roomType.name.en])),
    [roomTypes],
  );
  const sortedRoomTypes = useMemo(
    () => [...roomTypes].sort((a, b) => a.sortOrder - b.sortOrder || a.name.en.localeCompare(b.name.en)),
    [roomTypes],
  );
  const sortedRooms = useMemo(
    () => [...rooms].sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })),
    [rooms],
  );
  const bookedRoomIds = useMemo(
    () => new Set(bookings.map((booking) => booking.roomId).filter(Boolean)),
    [bookings],
  );
  const bookedRoomTypeIds = useMemo(
    () => new Set(bookings.map((booking) => booking.roomTypeId).filter(Boolean)),
    [bookings],
  );

  async function submitRoomType() {
    if (!roomTypeForm.nameEn || !roomTypeForm.nameNo || !roomTypeForm.slug || !roomTypeForm.basePriceNok) {
      setError("Name, slug, and base price are required.");
      return;
    }
    const body = {
      id: roomTypeForm.id,
      name: { en: roomTypeForm.nameEn, no: roomTypeForm.nameNo } satisfies Record<Locale, string>,
      description: {
        en: roomTypeForm.descriptionEn,
        no: roomTypeForm.descriptionNo,
      } satisfies Record<Locale, string>,
      slug: slugify(roomTypeForm.slug),
      basePrice: Math.round(Number(roomTypeForm.basePriceNok.replace(",", ".")) * 100),
      maxGuests: Number(roomTypeForm.maxGuests),
      hasBathroom: roomTypeForm.hasBathroom,
      amenities: splitList(roomTypeForm.amenities),
      photoUrls: [],
      sortOrder: Number(roomTypeForm.sortOrder),
      active: roomTypeForm.active,
    };

    await mutate({
      key: "room-type",
      url: "/api/admin/room-types",
      method: roomTypeForm.id ? "PATCH" : "POST",
      body,
      success: roomTypeForm.id ? "Room type updated." : "Room type added.",
      reset: () => setRoomTypeForm(emptyRoomType),
    });
  }

  async function submitRoom() {
    if (!roomForm.roomTypeId || !roomForm.roomNumber) {
      setError("Room type and room number are required.");
      return;
    }
    const body = {
      id: roomForm.id,
      roomTypeId: roomForm.roomTypeId,
      roomNumber: roomForm.roomNumber.trim(),
      floor: Number(roomForm.floor),
      notes: roomForm.notes || undefined,
      active: roomForm.active,
    };

    await mutate({
      key: "room",
      url: "/api/admin/rooms",
      method: roomForm.id ? "PATCH" : "POST",
      body,
      success: roomForm.id ? "Physical room updated." : "Physical room added.",
      reset: () => setRoomForm(emptyRoom(roomTypes)),
    });
  }

  async function mutate({
    key,
    url,
    method,
    body,
    success,
    reset,
  }: {
    key: string;
    url: string;
    method: "POST" | "PATCH" | "DELETE";
    body: Record<string, unknown>;
    success: string;
    reset?: () => void;
  }) {
    setLoadingKey(key);
    setError("");
    setStatus("");
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Could not save inventory.");
        return;
      }
      reset?.();
      setStatus(success);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoadingKey("");
    }
  }

  return (
    <div className="space-y-5">
      {(status || error) ? (
        <div
          className={
            error
              ? "rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
              : "rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          }
        >
          {error || status}
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Room types</h2>
            <p className="mt-1 text-sm text-slate-500">Guest-facing categories, pricing, capacity, and amenities.</p>
          </div>
          {roomTypeForm.id ? (
            <Button type="button" variant="ghost" onClick={() => setRoomTypeForm(emptyRoomType)}>
              <Plus className="h-4 w-4" />
              Add room type
            </Button>
          ) : null}
        </div>

        <form
          className="mt-4 grid gap-3 lg:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            submitRoomType();
          }}
        >
          <div>
            <FieldLabel>Name EN</FieldLabel>
            <TextInput
              value={roomTypeForm.nameEn}
              onChange={(event) => {
                const nextName = event.target.value;
                setRoomTypeForm((form) => ({
                  ...form,
                  nameEn: nextName,
                  slug: form.id ? form.slug : slugify(nextName),
                }));
              }}
            />
          </div>
          <div>
            <FieldLabel>Name NO</FieldLabel>
            <TextInput value={roomTypeForm.nameNo} onChange={(event) => setRoomTypeForm({ ...roomTypeForm, nameNo: event.target.value })} />
          </div>
          <div>
            <FieldLabel>Slug</FieldLabel>
            <TextInput value={roomTypeForm.slug} onChange={(event) => setRoomTypeForm({ ...roomTypeForm, slug: slugify(event.target.value) })} />
          </div>
          <div>
            <FieldLabel>Base price (NOK)</FieldLabel>
            <TextInput
              inputMode="decimal"
              value={roomTypeForm.basePriceNok}
              onChange={(event) => setRoomTypeForm({ ...roomTypeForm, basePriceNok: event.target.value })}
            />
          </div>
          <div>
            <FieldLabel>Max guests</FieldLabel>
            <TextInput
              type="number"
              min={1}
              value={roomTypeForm.maxGuests}
              onChange={(event) => setRoomTypeForm({ ...roomTypeForm, maxGuests: event.target.value })}
            />
          </div>
          <div>
            <FieldLabel>Sort order</FieldLabel>
            <TextInput
              type="number"
              value={roomTypeForm.sortOrder}
              onChange={(event) => setRoomTypeForm({ ...roomTypeForm, sortOrder: event.target.value })}
            />
          </div>
          <label className="flex h-11 items-center gap-2 self-end rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={roomTypeForm.hasBathroom}
              onChange={(event) => setRoomTypeForm({ ...roomTypeForm, hasBathroom: event.target.checked })}
            />
            Private bathroom
          </label>
          <label className="flex h-11 items-center gap-2 self-end rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={roomTypeForm.active}
              onChange={(event) => setRoomTypeForm({ ...roomTypeForm, active: event.target.checked })}
            />
            Active
          </label>
          <div className="lg:col-span-2">
            <FieldLabel>Description EN</FieldLabel>
            <TextArea value={roomTypeForm.descriptionEn} onChange={(event) => setRoomTypeForm({ ...roomTypeForm, descriptionEn: event.target.value })} />
          </div>
          <div className="lg:col-span-2">
            <FieldLabel>Description NO</FieldLabel>
            <TextArea value={roomTypeForm.descriptionNo} onChange={(event) => setRoomTypeForm({ ...roomTypeForm, descriptionNo: event.target.value })} />
          </div>
          <div className="lg:col-span-3">
            <FieldLabel>Amenities, comma separated</FieldLabel>
            <TextInput value={roomTypeForm.amenities} onChange={(event) => setRoomTypeForm({ ...roomTypeForm, amenities: event.target.value })} />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={loadingKey === "room-type"}>
              {loadingKey === "room-type" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {roomTypeForm.id ? "Save type" : "Add room type"}
            </Button>
          </div>
        </form>

        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {sortedRoomTypes.map((roomType) => {
            const typeRooms = rooms.filter((room) => room.roomTypeId === roomType.id);
            const count = typeRooms.filter((room) => room.active).length;
            const canDelete = typeRooms.length === 0 && !bookedRoomTypeIds.has(roomType.id);
            return (
              <div key={roomType.id} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-950">{roomType.name.en}</h3>
                      <Badge tone={roomType.active ? "green" : "slate"}>{roomType.active ? "Active" : "Inactive"}</Badge>
                      {roomType.hasBathroom ? <Bath className="h-4 w-4 text-teal-700" /> : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{roomType.description.en}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      {formatCurrency(roomType.basePrice)} / night - {roomType.maxGuests} guests - {count} rooms
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => setRoomTypeForm(fromRoomType(roomType))}>
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={loadingKey === `type-${roomType.id}`}
                      onClick={() =>
                        mutate({
                          key: `type-${roomType.id}`,
                          url: "/api/admin/room-types",
                          method: "DELETE",
                          body: { id: roomType.id },
                          success: "Room type deactivated.",
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                      Deactivate
                    </Button>
                    {canDelete ? (
                      <Button
                        type="button"
                        variant="danger"
                        disabled={loadingKey === `type-delete-${roomType.id}`}
                        onClick={() =>
                          mutate({
                            key: `type-delete-${roomType.id}`,
                            url: "/api/admin/room-types",
                            method: "DELETE",
                            body: { id: roomType.id, hardDelete: true },
                            success: "Room type deleted.",
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Physical rooms</h2>
            <p className="mt-1 text-sm text-slate-500">Actual room numbers assigned to room types for calendar and cleaning work.</p>
          </div>
          {roomForm.id ? (
            <Button type="button" variant="ghost" onClick={() => setRoomForm(emptyRoom(roomTypes))}>
              <Plus className="h-4 w-4" />
              Add physical room
            </Button>
          ) : null}
        </div>

        <form
          className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_2fr_auto_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            submitRoom();
          }}
        >
          <div>
            <FieldLabel>Room type</FieldLabel>
            <SelectInput value={roomForm.roomTypeId} onChange={(event) => setRoomForm({ ...roomForm, roomTypeId: event.target.value })}>
              {sortedRoomTypes.map((roomType) => (
                <option key={roomType.id} value={roomType.id}>
                  {roomType.name.en}
                </option>
              ))}
            </SelectInput>
          </div>
          <div>
            <FieldLabel>Room number</FieldLabel>
            <TextInput value={roomForm.roomNumber} onChange={(event) => setRoomForm({ ...roomForm, roomNumber: event.target.value })} />
          </div>
          <div>
            <FieldLabel>Floor</FieldLabel>
            <TextInput type="number" value={roomForm.floor} onChange={(event) => setRoomForm({ ...roomForm, floor: event.target.value })} />
          </div>
          <div>
            <FieldLabel>Notes</FieldLabel>
            <TextInput value={roomForm.notes} onChange={(event) => setRoomForm({ ...roomForm, notes: event.target.value })} />
          </div>
          <label className="flex h-11 items-center gap-2 self-end rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={roomForm.active}
              onChange={(event) => setRoomForm({ ...roomForm, active: event.target.checked })}
            />
            Active
          </label>
          <div className="flex items-end">
            <Button type="submit" disabled={loadingKey === "room"}>
              {loadingKey === "room" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {roomForm.id ? "Save room" : "Add room"}
            </Button>
          </div>
        </form>

        <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {sortedRooms.map((room) => {
            const canDelete = !bookedRoomIds.has(room.id);
            return (
              <div key={room.id} className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-slate-950">
                      <BedDouble className="h-4 w-4 text-teal-700" />
                      Room {room.roomNumber}
                      <Badge tone={room.active ? "green" : "slate"}>{room.active ? "Active" : "Inactive"}</Badge>
                    </div>
                    <p className="mt-1 text-slate-500">
                      {roomTypeNameById.get(room.roomTypeId) ?? "Room type"} - Floor {room.floor}
                    </p>
                    {room.notes ? <p className="mt-1 text-slate-500">{room.notes}</p> : null}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={() => setRoomForm(fromRoom(room))}>
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={loadingKey === `room-${room.id}`}
                      onClick={() =>
                        mutate({
                          key: `room-${room.id}`,
                          url: "/api/admin/rooms",
                          method: "DELETE",
                          body: { id: room.id },
                          success: "Physical room deactivated.",
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                      Deactivate
                    </Button>
                    {canDelete ? (
                      <Button
                        type="button"
                        variant="danger"
                        disabled={loadingKey === `room-delete-${room.id}`}
                        onClick={() =>
                          mutate({
                            key: `room-delete-${room.id}`,
                            url: "/api/admin/rooms",
                            method: "DELETE",
                            body: { id: room.id, hardDelete: true },
                            success: "Physical room deleted.",
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function fromRoomType(roomType: RoomType): RoomTypeFormState {
  return {
    id: roomType.id,
    nameEn: roomType.name.en,
    nameNo: roomType.name.no,
    descriptionEn: roomType.description.en,
    descriptionNo: roomType.description.no,
    slug: roomType.slug,
    basePriceNok: String(roomType.basePrice / 100),
    maxGuests: String(roomType.maxGuests),
    hasBathroom: roomType.hasBathroom,
    amenities: roomType.amenities.join(", "),
    sortOrder: String(roomType.sortOrder),
    active: roomType.active,
  };
}

function fromRoom(room: Room): RoomFormState {
  return {
    id: room.id,
    roomTypeId: room.roomTypeId,
    roomNumber: room.roomNumber,
    floor: String(room.floor),
    notes: room.notes ?? "",
    active: room.active,
  };
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
