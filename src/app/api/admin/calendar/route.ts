import { NextResponse } from "next/server";
import { demoBookings, demoRooms } from "@/lib/db/seed";

export async function GET() {
  return NextResponse.json({ rooms: demoRooms, bookings: demoBookings });
}
