import { NextResponse } from "next/server";
import { cancelStalePendingBookings } from "@/lib/db/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STALE_PENDING_MINUTES = 60;

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - STALE_PENDING_MINUTES * 60_000);
    const { cancelledRefs } = await cancelStalePendingBookings(cutoff);

    return NextResponse.json({
      ranAt: new Date().toISOString(),
      cutoff: cutoff.toISOString(),
      stalePendingMinutes: STALE_PENDING_MINUTES,
      cancelled: cancelledRefs.length,
      cancelledRefs,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "cleanup-cron-failed",
      },
      { status: 500 },
    );
  }
}
