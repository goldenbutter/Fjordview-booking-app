"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/auth";
import { env } from "@/lib/env";

const magicLinkSchema = z.object({
  email: z.string().email(),
  next: z.string().startsWith("/").default("/admin"),
});

const passwordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  next: z.string().startsWith("/").default("/admin"),
});

export async function requestMagicLink(formData: FormData) {
  if (env.localDemoMode) {
    redirect("/admin");
  }

  const parsed = magicLinkSchema.safeParse({
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

export async function signInWithPassword(formData: FormData) {
  if (env.localDemoMode) {
    redirect("/admin");
  }

  const parsed = passwordSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || "/admin",
  });

  if (!parsed.success) {
    redirect("/login?error=invalid-credentials");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect("/login?error=supabase-not-configured");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    redirect("/login?error=invalid-credentials");
  }

  redirect(parsed.data.next);
}
