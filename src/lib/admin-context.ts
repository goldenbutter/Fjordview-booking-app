import { createSupabaseServerClient } from "@/lib/auth";
import {
  getActiveAdminUserBySupabaseUserId,
  getPropertyById,
  getPropertyBySlug,
  type AdminUser,
} from "@/lib/db/queries";
import { env } from "@/lib/env";
import type { Property } from "@/types";

type ResolveAdminPropertyIdInput = {
  localDemoMode: boolean;
  defaultPropertyId: string | null;
  userId: string | null;
  findAdminPropertyId: (userId: string) => Promise<string | null>;
};

export async function resolveAdminPropertyId({
  localDemoMode,
  defaultPropertyId,
  userId,
  findAdminPropertyId,
}: ResolveAdminPropertyIdInput): Promise<string | null> {
  if (localDemoMode) {
    return defaultPropertyId;
  }
  if (!userId) {
    return null;
  }
  return findAdminPropertyId(userId);
}

export type AdminContext = {
  property: Property;
  adminUser: AdminUser | null;
};

export async function getCurrentAdminContext(): Promise<AdminContext | null> {
  const defaultProperty = await getPropertyBySlug(env.defaultPropertySlug);
  if (env.localDemoMode) {
    return defaultProperty ? { property: defaultProperty, adminUser: null } : null;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const adminUser = await getActiveAdminUserBySupabaseUserId(user.id);
  const propertyId = await resolveAdminPropertyId({
    localDemoMode: false,
    defaultPropertyId: defaultProperty?.id ?? null,
    userId: user.id,
    findAdminPropertyId: async () => adminUser?.propertyId ?? null,
  });
  if (!propertyId || !adminUser) {
    return null;
  }

  const property = await getPropertyById(propertyId);
  return property ? { property, adminUser } : null;
}
