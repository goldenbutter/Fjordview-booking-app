import { Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getAdminSnapshot } from "@/lib/admin-metrics";
import { formatCurrency } from "@/lib/utils";

export default function AdminGuestsPage() {
  const snapshot = getAdminSnapshot();
  return (
    <main className="space-y-5 p-5">
      <div>
        <h1 className="text-3xl font-semibold">Guests</h1>
        <p className="mt-1 text-slate-500">Guest profiles and booking history.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {snapshot.guests.map((guest) => (
          <div key={guest.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{guest.firstName} {guest.lastName}</h2>
                <div className="mt-2 space-y-1 text-sm text-slate-500">
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {guest.email}</div>
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {guest.phone}</div>
                </div>
              </div>
              <Badge tone="teal">{guest.language.toUpperCase()}</Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-md bg-slate-50 p-3"><div className="text-xs text-slate-500">Bookings</div><div className="font-semibold">{guest.totalBookings}</div></div>
              <div className="rounded-md bg-slate-50 p-3"><div className="text-xs text-slate-500">Spent</div><div className="font-semibold">{formatCurrency(guest.totalSpent)}</div></div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
