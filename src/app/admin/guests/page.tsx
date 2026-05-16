import Link from "next/link";
import { ChevronRight, Mail, Phone, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { getAdminSnapshot } from "@/lib/admin-metrics";
import { formatCurrency } from "@/lib/utils";

export default async function AdminGuestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = await searchParams;
  const snapshot = await getAdminSnapshot();

  if (!snapshot) {
    return (
      <main className="space-y-5 p-5">
        <h1 className="text-3xl font-semibold">Guests</h1>
        <p className="mt-1 text-rose-700">Property not found.</p>
      </main>
    );
  }

  const needle = (query.q ?? "").toLowerCase().trim();
  const filtered = needle
    ? snapshot.guests.filter(
        (guest) =>
          guest.firstName.toLowerCase().includes(needle) ||
          guest.lastName.toLowerCase().includes(needle) ||
          guest.email.toLowerCase().includes(needle) ||
          (guest.phone ?? "").toLowerCase().includes(needle),
      )
    : snapshot.guests;

  return (
    <main className="space-y-5 p-5">
      <div>
        <h1 className="text-3xl font-semibold">Guests</h1>
        <p className="mt-1 text-slate-500">
          {needle ? `${filtered.length} matching` : `${snapshot.guests.length} guests on record`}
        </p>
      </div>

      <form className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <TextInput
            name="q"
            defaultValue={query.q ?? ""}
            className="pl-9"
            placeholder="Search by name, email, or phone"
          />
        </div>
        <Button type="submit">Search</Button>
        {needle ? (
          <Link
            href="/admin/guests"
            className="inline-flex h-11 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Clear
          </Link>
        ) : null}
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.length === 0 ? (
          <div className="md:col-span-2 rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No guests match this search.
          </div>
        ) : (
          filtered.map((guest) => (
            <Link
              key={guest.id}
              href={`/admin/guests/${guest.id}`}
              className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:bg-teal-50/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950 group-hover:text-teal-700">{guest.firstName} {guest.lastName}</h2>
                  <div className="mt-2 space-y-1 text-sm text-slate-500">
                    <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {guest.email}</div>
                    {guest.phone ? <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {guest.phone}</div> : null}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge tone="teal">{guest.language.toUpperCase()}</Badge>
                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-teal-600" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-md bg-slate-50 p-3"><div className="text-xs text-slate-500">Bookings</div><div className="font-semibold">{guest.totalBookings}</div></div>
                <div className="rounded-md bg-slate-50 p-3"><div className="text-xs text-slate-500">Spent</div><div className="font-semibold">{formatCurrency(guest.totalSpent)}</div></div>
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
