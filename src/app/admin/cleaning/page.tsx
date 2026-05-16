import { CleaningList } from "@/components/admin/admin-cards";
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
        <p className="mt-1 text-slate-500">Daily room turnover task list.</p>
      </div>
      <CleaningList tasks={snapshot.cleaningTasks} />
    </main>
  );
}
