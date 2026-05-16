"use client";

import { useMemo, useState } from "react";
import { calculateNightlyPrice } from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";
import type { PricingRule, RoomType } from "@/types";

export function PricingPreview({
  roomTypes,
  pricingRules,
}: {
  roomTypes: RoomType[];
  pricingRules: PricingRule[];
}) {
  const [roomTypeId, setRoomTypeId] = useState(roomTypes[0]?.id ?? "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const result = useMemo(() => {
    const roomType = roomTypes.find((rt) => rt.id === roomTypeId);
    if (!roomType) return null;
    const rulesForType = pricingRules.filter((r) => !r.roomTypeId || r.roomTypeId === roomTypeId);
    return {
      roomType,
      ...calculateNightlyPrice(roomType.basePrice, new Date(`${date}T00:00:00Z`), rulesForType),
    };
  }, [roomTypeId, date, pricingRules, roomTypes]);

  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50 p-5">
      <div className="text-sm font-semibold text-teal-700">Price preview</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_220px]">
        <div>
          <label htmlFor="pp-type" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Room type</label>
          <select
            id="pp-type"
            value={roomTypeId}
            onChange={(event) => setRoomTypeId(event.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
          >
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>{rt.name.en}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pp-date" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Date</label>
          <input
            id="pp-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
          />
        </div>
      </div>
      {result ? (
        <div className="mt-4 rounded-md bg-white p-4">
          <div className="text-xl font-semibold text-slate-950">
            {result.roomType.name.en} on {date} = {formatCurrency(result.price)}
          </div>
          <p className="text-sm text-slate-600">
            Base {formatCurrency(result.roomType.basePrice)} · Applied rule: {result.appliedRule ?? "Base price"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
