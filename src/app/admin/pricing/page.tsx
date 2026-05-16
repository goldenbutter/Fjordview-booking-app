import { Badge } from "@/components/ui/badge";
import { PricingPreview } from "@/components/admin/pricing-preview";
import { getAdminSnapshot } from "@/lib/admin-metrics";
import { formatCurrency } from "@/lib/utils";

export default async function AdminPricingPage() {
  const snapshot = await getAdminSnapshot();

  if (!snapshot || snapshot.roomTypes.length === 0) {
    return (
      <main className="space-y-5 p-5">
        <h1 className="text-3xl font-semibold">Pricing</h1>
        <p className="mt-1 text-rose-700">Property not found or has no room types.</p>
      </main>
    );
  }

  return (
    <main className="space-y-5 p-5">
      <div>
        <h1 className="text-3xl font-semibold">Pricing</h1>
        <p className="mt-1 text-slate-500">Base prices, rules, and effective price preview.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {snapshot.roomTypes.map((roomType) => (
          <div key={roomType.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">{roomType.name.en}</div>
            <div className="mt-2 text-2xl font-semibold">{formatCurrency(roomType.basePrice)}</div>
            <div className="mt-1 text-xs text-slate-500">per night</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Rules</h2>
        <div className="mt-3 grid gap-3">
          {snapshot.pricingRules.length === 0 ? (
            <p className="text-sm text-slate-500">No pricing rules. Bookings use the base price for every night.</p>
          ) : (
            snapshot.pricingRules.map((rule) => (
              <div key={rule.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
                <div>
                  <div className="font-semibold">{rule.name}</div>
                  <div className="text-sm text-slate-500">
                    {rule.ruleType.replace("_", " ")} · priority {rule.priority}
                    {rule.startDate && rule.endDate ? ` · ${rule.startDate} → ${rule.endDate}` : ""}
                    {rule.daysOfWeek && rule.daysOfWeek.length > 0 ? ` · days ${rule.daysOfWeek.join(",")}` : ""}
                  </div>
                </div>
                <Badge tone="amber">{rule.modifierPct ? `${rule.modifierPct}%` : formatCurrency(rule.priceOverride ?? 0)}</Badge>
              </div>
            ))
          )}
        </div>
      </div>
      <PricingPreview roomTypes={snapshot.roomTypes} pricingRules={snapshot.pricingRules} />
    </main>
  );
}
