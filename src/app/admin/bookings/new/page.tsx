import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getActiveRoomTypes, getPropertyBySlug } from "@/lib/db/queries";
import { env } from "@/lib/env";
import { ManualBookingForm } from "./manual-booking-form";

function todayIso() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default async function NewBookingPage() {
  const property = await getPropertyBySlug(env.defaultPropertySlug);
  if (!property) {
    return (
      <main className="space-y-5 p-5">
        <h1 className="text-3xl font-semibold">Manual booking</h1>
        <p className="mt-1 text-rose-700">Property not found.</p>
      </main>
    );
  }
  const roomTypes = await getActiveRoomTypes(property.id);

  return (
    <main className="space-y-5 p-5">
      <Link href="/admin/bookings" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-teal-700">
        <ArrowLeft className="h-4 w-4" /> Back to bookings
      </Link>
      <div>
        <h1 className="text-3xl font-semibold">Manual booking</h1>
        <p className="mt-1 text-slate-500">For walk-ins, phone bookings, or anything not coming through the public site.</p>
      </div>
      <ManualBookingForm roomTypes={roomTypes} defaultCheckIn={todayIso()} defaultCheckOut={tomorrowIso()} />
    </main>
  );
}
