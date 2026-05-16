import { NextResponse } from "next/server";

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    mode: "local-demo",
    job: "stale pending cleanup",
    cancelledBookings: 0,
  });
}
