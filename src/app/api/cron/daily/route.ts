import { NextResponse } from "next/server";
import {
  ensureCleaningTask,
  getBookingByRef,
  getBookingRefsForCheckInDate,
  getBookingRefsForCheckOutDate,
} from "@/lib/db/queries";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

// UTC date offsets. Vercel cron fires the daily job at 08:00 UTC (= 09:00 CET /
// 10:00 CEST), so "today" UTC is already the same calendar day as Norway and
// "tomorrow" UTC is the next day for arriving guests.
function isoDateOffset(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type SendResult = { ref: string; ok: boolean; reason?: string };

async function sendForRefs(
  refs: string[],
  type: "reminder" | "thank_you",
): Promise<SendResult[]> {
  const results: SendResult[] = [];
  for (const ref of refs) {
    try {
      const detail = await getBookingByRef(ref);
      if (!detail) {
        results.push({ ref, ok: false, reason: "not-found" });
        continue;
      }
      const selfServiceUrl = `${env.appUrl}/booking/${encodeURIComponent(detail.booking.bookingRef)}?email=${encodeURIComponent(detail.guest.email)}`;
      const sendResult = await sendEmail({ ...detail, selfServiceUrl, type });
      results.push({ ref, ok: sendResult.status === "sent" || sendResult.status === "logged" });
    } catch (error) {
      results.push({
        ref,
        ok: false,
        reason: error instanceof Error ? error.message : "send-failed",
      });
    }
  }
  return results;
}

async function generateCleaningTasksForCheckoutsToday(checkOutDate: string) {
  const refs = await getBookingRefsForCheckOutDate(checkOutDate);
  let created = 0;
  let skipped = 0;
  for (const ref of refs) {
    const detail = await getBookingByRef(ref);
    if (!detail || !detail.room) {
      skipped++;
      continue;
    }
    const result = await ensureCleaningTask({
      propertyId: detail.property.id,
      roomId: detail.room.id,
      taskDate: checkOutDate,
      bookingId: detail.booking.id,
    });
    if (result.created) created++;
    else skipped++;
  }
  return { created, skipped, considered: refs.length };
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = isoDateOffset(0);
  const tomorrow = isoDateOffset(1);
  const yesterday = isoDateOffset(-1);

  try {
    const reminderRefs = await getBookingRefsForCheckInDate(tomorrow);
    const reminders = await sendForRefs(reminderRefs, "reminder");

    const thankyouRefs = await getBookingRefsForCheckOutDate(yesterday);
    const thankyous = await sendForRefs(thankyouRefs, "thank_you");

    const cleaning = await generateCleaningTasksForCheckoutsToday(today);

    return NextResponse.json({
      ranAt: new Date().toISOString(),
      reminders: {
        date: tomorrow,
        attempted: reminders.length,
        succeeded: reminders.filter((r) => r.ok).length,
        failed: reminders.filter((r) => !r.ok),
      },
      thankyous: {
        date: yesterday,
        attempted: thankyous.length,
        succeeded: thankyous.filter((r) => r.ok).length,
        failed: thankyous.filter((r) => !r.ok),
      },
      cleaningTasks: {
        date: today,
        ...cleaning,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "daily-cron-failed",
      },
      { status: 500 },
    );
  }
}
