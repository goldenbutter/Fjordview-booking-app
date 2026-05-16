import { Badge } from "@/components/ui/badge";
import { getAdminSnapshot } from "@/lib/admin-metrics";
import { calculateNightlyPrice } from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";

export default function AdminPricingPage() {
  const snapshot = getAdminSnapshot();
  const previewRoom = snapshot.roomTypes[0];
  const preview = calculateNightlyPrice(previewRoom.basePrice, new Date("2026-06-20"), snapshot.pricingRules);

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
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Rules</h2>
        <div className="mt-3 grid gap-3">
          {snapshot.pricingRules.map((rule) => (
            <div key={rule.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
              <div>
                <div className="font-semibold">{rule.name}</div>
                <div className="text-sm text-slate-500">{rule.ruleType.replace("_", " ")} · priority {rule.priority}</div>
              </div>
              <Badge tone="amber">{rule.modifierPct ? `${rule.modifierPct}%` : formatCurrency(rule.priceOverride ?? 0)}</Badge>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-teal-200 bg-teal-50 p-5">
        <div className="text-sm font-semibold text-teal-700">Preview</div>
        <div className="mt-1 text-xl font-semibold text-slate-950">
          {previewRoom.name.en} on 20.06.2026 = {formatCurrency(preview.price)}
        </div>
        <p className="text-sm text-slate-600">Applied rule: {preview.appliedRule ?? "Base price"}</p>
      </div>
    </main>
  );
}
