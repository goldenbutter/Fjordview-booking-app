import {
  type AdminBookingRow,
  type AdminCleaningRow,
  type AdminSnapshot,
  getAdminSnapshotForProperty,
} from "@/lib/db/queries";
import { getCurrentAdminContext } from "@/lib/admin-context";

export type { AdminBookingRow, AdminCleaningRow, AdminSnapshot };

export async function getAdminSnapshot(): Promise<AdminSnapshot | null> {
  const context = await getCurrentAdminContext();
  return context ? getAdminSnapshotForProperty(context.property.id) : null;
}
