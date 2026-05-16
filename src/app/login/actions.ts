"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/auth";
import { env } from "@/lib/env";

const loginSchema = z.object({
  email: z.string().email(),
  next: z.string().startsWith("/").default("/admin"),
});

export async function requestMagicLink(formData: FormData) {
  if (env.localDemoMode) {
    redirect("/admin");
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") || "/admin",
  });

  if (!parsed.success) {
    redirect("/login?error=invalid-email");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect("/login?error=supabase-not-configured");
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${env.appUrl}${parsed.data.next}`,
    },
  });

  if (error) {
    redirect("/login?error=login-failed");
  }

  redirect(`/login?sent=1&next=${encodeURIComponent(parsed.data.next)}`);
}
