import { NextResponse } from "next/server";
import { z } from "zod";
import { updateCleaningTaskStatus } from "@/lib/db/queries";

const schema = z.object({
  status: z.enum(["pending", "in_progress", "completed"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updateCleaningTaskStatus(id, parsed.data.status);
  if (!updated) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  return NextResponse.json({ task: updated });
}
