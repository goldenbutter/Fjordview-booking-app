"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { AdminCleaningRow } from "@/lib/db/queries";

const CYCLE: Record<string, "pending" | "in_progress" | "completed"> = {
  pending: "in_progress",
  in_progress: "completed",
  completed: "pending",
};

function tone(status: string) {
  switch (status) {
    case "completed": return "green" as const;
    case "in_progress": return "teal" as const;
    case "pending": return "amber" as const;
    default: return "slate" as const;
  }
}

export function CleaningRow({ task }: { task: AdminCleaningRow }) {
  const router = useRouter();
  const [status, setStatus] = useState<string>(task.status);
  const [loading, setLoading] = useState(false);

  async function cycle() {
    const next = CYCLE[status] ?? "pending";
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/cleaning/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (response.ok) {
        setStatus(next);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={cycle}
      disabled={loading}
      className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-teal-300 hover:bg-teal-50/30 disabled:opacity-60"
    >
      <div>
        <div className="font-semibold text-slate-950">Room {task.roomLabel}</div>
        <div className="text-sm text-slate-500">{formatDate(task.taskDate)} · Assigned to {task.assignedTo ?? "Unassigned"}</div>
      </div>
      <div className="flex items-center gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
        <Badge tone={tone(status)}>{status.replace("_", " ")}</Badge>
        <span className="text-xs text-slate-400">tap to cycle →</span>
      </div>
    </button>
  );
}
