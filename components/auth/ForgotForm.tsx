"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction, type ResetRequestState } from "@/app/actions/auth";

export function ForgotForm() {
  const [state, action, pending] = useActionState<ResetRequestState, FormData>(requestPasswordResetAction, undefined);

  if (state?.sent) {
    return (
      <div className="rounded-2xl border border-[#cfe8d8] bg-[#eef6f0] px-4 py-4 text-sm text-money-dark">
        If an account exists for that email, we&apos;ve sent a reset link. Check your inbox (and spam), it&apos;s valid for 1 hour.
        <div className="mt-3">
          <Link href="/login" className="font-bold text-indigo-brand">Back to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3.5">
      <label className="block">
        <span className="label">Email</span>
        <input name="email" type="email" required placeholder="you@email.co.za" className="field mt-1.5" />
      </label>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <p className="text-center text-sm text-muted-soft">
        Remembered it?{" "}
        <Link href="/login" className="font-bold text-magenta-brand">Sign in</Link>
      </p>
    </form>
  );
}
