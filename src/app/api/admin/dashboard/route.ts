import { NextResponse } from "next/server";
import { getAdminSnapshot } from "@/lib/admin-metrics";

export async function GET() {
  const snapshot = await getAdminSnapshot();
  if (!snapshot) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }
  return NextResponse.json(snapshot);
}
