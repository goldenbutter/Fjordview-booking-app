import { CleaningRow } from "@/components/admin/cleaning-row";
import { getAdminSnapshot } from "@/lib/admin-metrics";

export default async function AdminCleaningPage() {
  const snapshot = await getAdminSnapshot();

  if (!snapshot) {
    return (
      <main className="space-y-5 p-5">
        <h1 className="text-3xl font-semibold">Cleaning</h1>
        <p className="mt-1 text-rose-700">Property not found.</p>
      </main>
    );
  }

  return (
    <main className="space-y-5 p-5">
      <div>
        <h1 className="text-3xl font-semibold">Cleaning</h1>
        <p className="mt-1 text-slate-500">Tap a task to cycle status: pending → in progress → completed → pending.</p>
      </div>
      <div className="grid gap-3">
        {snapshot.cleaningTasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No housekeeping tasks scheduled.
          </div>
        ) : (
          snapshot.cleaningTasks.map((task) => <CleaningRow key={task.id} task={task} />)
        )}
      </div>
    </main>
  );
}
