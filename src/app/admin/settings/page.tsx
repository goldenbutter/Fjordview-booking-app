import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { env } from "@/lib/env";
import { getPropertyBySlug } from "@/lib/db/queries";
import { PropertyForm } from "./property-form";

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
        <p className="mt-1 text-slate-500">Property configuration. Changes persist to Supabase immediately.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Property info</h2>
          <p className="mt-1 text-sm text-slate-500">Saved values show on the public booking page, in emails, and on invoices.</p>
          <div className="mt-4">
            <PropertyForm property={property} />
          </div>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm h-fit">
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
          <p className="mt-4 text-xs text-slate-500">Editing policies and inviting additional admins are not yet wired (P1 enhancement).</p>
        </section>
      </div>
    </main>
  );
}
