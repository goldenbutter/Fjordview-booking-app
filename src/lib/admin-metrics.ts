import { env } from "@/lib/env";
import {
  type AdminBookingRow,
  type AdminCleaningRow,
  type AdminSnapshot,
  getAdminSnapshotForSlug,
} from "@/lib/db/queries";

export type { AdminBookingRow, AdminCleaningRow, AdminSnapshot };

export async function getAdminSnapshot(): Promise<AdminSnapshot | null> {
  return getAdminSnapshotForSlug(env.defaultPropertySlug);
}
