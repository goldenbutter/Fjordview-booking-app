import { Search } from "lucide-react";
import { BookingTable } from "@/components/admin/admin-cards";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { getAdminSnapshot } from "@/lib/admin-metrics";

export default async function AdminBookingsPage() {
  const snapshot = await getAdminSnapshot();

  if (!snapshot) {
    return (
      <main className="space-y-5 p-5">
        <h1 className="text-3xl font-semibold">Bookings</h1>
        <p className="mt-1 text-rose-700">Property not found. Run <code>npm run seed</code>.</p>
      </main>
    );
  }

  return (
    <main className="space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Bookings</h1>
          <p className="mt-1 text-slate-500">{snapshot.recentBookings.length} bookings on record.</p>
        </div>
        <Button>Manual booking</Button>
      </div>
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_160px_160px_160px]">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <TextInput className="pl-9" placeholder="Search guest, email, or booking ref" />
        </div>
        <TextInput placeholder="Status" />
        <TextInput placeholder="Room type" />
        <TextInput placeholder="Payment" />
      </div>
      <BookingTable bookings={snapshot.recentBookings} />
    </main>
  );
}
