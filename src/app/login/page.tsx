import Link from "next/link";
import { requestMagicLink, signInWithPassword } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { FieldLabel, TextInput } from "@/components/ui/field";
import { env } from "@/lib/env";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; sent?: string }>;
}) {
  const query = await searchParams;
  const next = query.next?.startsWith("/") ? query.next : "/admin";

  const errorMessages: Record<string, string> = {
    "invalid-email": "Please enter a valid email address.",
    "invalid-credentials": "Email or password is incorrect.",
    "supabase-not-configured": "Supabase is not configured for this environment.",
    "login-failed": "Could not send the magic link. Try again.",
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-teal-700">GuestHub admin</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">
          Use your admin email and password, or request a magic link.
        </p>

        {env.localDemoMode ? (
          <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Local demo mode is enabled, so admin auth is bypassed.
            <Link href="/admin" className="ml-1 font-semibold underline">
              Open admin
            </Link>
          </div>
        ) : (
          <>
            <form action={signInWithPassword} className="mt-5 space-y-4">
              <input type="hidden" name="next" value={next} />
              <div>
                <FieldLabel>Email</FieldLabel>
                <TextInput name="email" type="email" placeholder="owner@example.com" required />
              </div>
              <div>
                <FieldLabel>Password</FieldLabel>
                <TextInput name="password" type="password" placeholder="Your password" required />
              </div>
              <Button className="w-full" type="submit">
                Sign in
              </Button>
            </form>

            <div className="mt-6 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
              <div className="h-px flex-1 bg-slate-200" />
              or
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <form action={requestMagicLink} className="mt-6 space-y-3">
              <input type="hidden" name="next" value={next} />
              <div>
                <FieldLabel>Email</FieldLabel>
                <TextInput name="email" type="email" placeholder="owner@example.com" required />
              </div>
              <Button className="w-full" type="submit" variant="secondary">
                Send magic link
              </Button>
            </form>
          </>
        )}

        {query.sent ? (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Check your email for the sign-in link.
          </div>
        ) : null}

        {query.error ? (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {errorMessages[query.error] ?? `Login could not be completed: ${query.error}.`}
          </div>
        ) : null}
      </section>
    </main>
  );
}
