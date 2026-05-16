import { NextResponse } from "next/server";
import { getAdminSnapshot } from "@/lib/admin-metrics";

export async function GET() {
  return NextResponse.json(getAdminSnapshot());
}
