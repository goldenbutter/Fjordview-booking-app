import { demoCancellationPolicy, demoProperty } from "@/lib/db/seed";

export default function AdminSettingsPage() {
  return (
    <main className="space-y-5 p-5">
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="mt-1 text-slate-500">Property configuration for the demo tenant.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Property info</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Name</dt><dd className="font-semibold">{demoProperty.name}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Address</dt><dd>{demoProperty.address}, {demoProperty.city}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Email</dt><dd>{demoProperty.contactEmail}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Phone</dt><dd>{demoProperty.contactPhone}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Check-in/out</dt><dd>{demoProperty.checkInTime} / {demoProperty.checkOutTime}</dd></div>
          </dl>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Cancellation policy</h2>
          <div className="mt-4 rounded-md bg-slate-50 p-4">
            <div className="font-semibold">{demoCancellationPolicy.name}</div>
            <p className="mt-1 text-sm text-slate-600">{demoCancellationPolicy.description.en}</p>
            <p className="mt-2 text-sm text-slate-500">Refund {demoCancellationPolicy.refundPct}% until {demoCancellationPolicy.deadlineHours} hours before check-in.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
