import { NextResponse } from "next/server";
import { demoBookings } from "@/lib/db/seed";

export async function GET() {
  return NextResponse.json({ bookings: demoBookings });
}
