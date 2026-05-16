import { CleaningList } from "@/components/admin/admin-cards";
import { getAdminSnapshot } from "@/lib/admin-metrics";

export default function AdminCleaningPage() {
  const snapshot = getAdminSnapshot();
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
