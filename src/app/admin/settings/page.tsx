import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { env } from "@/lib/env";
import { getPropertyBySlug } from "@/lib/db/queries";

export default async function AdminSettingsPage() {
  const property = await getPropertyBySlug(env.defaultPropertySlug);
  if (!property) {
    return (
      <main className="space-y-5 p-5">
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="mt-1 text-rose-700">Property not found.</p>
      </main>
    );
  }

  const db = getDb();
  const policyRows = await db
    .select()
    .from(schema.cancellationPolicies)
    .where(
      and(
        eq(schema.cancellationPolicies.propertyId, property.id),
        eq(schema.cancellationPolicies.isDefault, true),
        eq(schema.cancellationPolicies.active, true),
      ),
    )
    .limit(1);
  const policy = policyRows[0];

  return (
    <main className="space-y-5 p-5">
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="mt-1 text-slate-500">Property configuration.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Property info</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Name</dt><dd className="font-semibold">{property.name}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Address</dt><dd>{property.address}, {property.city}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Email</dt><dd>{property.contactEmail}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Phone</dt><dd>{property.contactPhone}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Check-in/out</dt><dd>{property.checkInTime} / {property.checkOutTime}</dd></div>
          </dl>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Cancellation policy</h2>
          {policy ? (
            <div className="mt-4 rounded-md bg-slate-50 p-4">
              <div className="font-semibold">{policy.name}</div>
              <p className="mt-1 text-sm text-slate-600">{(policy.description as { en?: string } | null)?.en ?? ""}</p>
              <p className="mt-2 text-sm text-slate-500">Refund {policy.refundPct}% until {policy.deadlineHours} hours before check-in.</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No default policy configured.</p>
          )}
        </section>
      </div>
    </main>
  );
}
