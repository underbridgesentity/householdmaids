"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthState } from "@/app/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-3.5">
      {state?.error && (
        <div className="rounded-2xl border border-[#f0d6d6] bg-[#fdf3f3] px-4 py-3 text-sm font-semibold text-[#d05656]">
          {state.error}
        </div>
      )}
      <label className="block">
        <span className="label">Email</span>
        <input name="email" type="email" required placeholder="you@email.co.za" className="field mt-1.5" />
      </label>
      <label className="block">
        <span className="label">Password</span>
        <input name="password" type="password" required placeholder="Your password" className="field mt-1.5" />
      </label>
      <button type="submit" disabled={pending} className="btn-primary mt-2 w-full">
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-muted-soft">
        New here?{" "}
        <Link href="/signup" className="font-bold text-magenta-brand">Create an account</Link>
      </p>
    </form>
  );
}
