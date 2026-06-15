"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction, type AuthState } from "@/app/actions/auth";

export function SignupForm({ presetCode }: { presetCode?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signupAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-3.5">
      {state?.error && (
        <div className="rounded-2xl border border-[#f0d6d6] bg-[#fdf3f3] px-4 py-3 text-sm font-semibold text-[#d05656]">
          {state.error}
        </div>
      )}
      <label className="block">
        <span className="label">Full name</span>
        <input name="fullName" required defaultValue="" placeholder="Your name" className="field mt-1.5" />
      </label>
      <label className="block">
        <span className="label">Mobile number</span>
        <input name="phone" placeholder="+27 …" className="field mt-1.5" />
      </label>
      <label className="block">
        <span className="label">Email</span>
        <input name="email" type="email" required placeholder="you@email.co.za" className="field mt-1.5" />
      </label>
      <label className="block">
        <span className="label">Password</span>
        <input name="password" type="password" required minLength={8} placeholder="At least 8 characters" className="field mt-1.5" />
      </label>

      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-[#d9c8e6] bg-surface-lav px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white">🎟️</div>
        <div className="flex-1">
          <div className="text-[13px] font-bold text-indigo-brand">Have a referral code?</div>
          <input
            name="referralCode"
            defaultValue={presetCode}
            placeholder="FRIEND-1234"
            className="mt-0.5 w-full border-none bg-transparent font-bold uppercase tracking-wide text-magenta-brand outline-none placeholder:font-normal placeholder:normal-case placeholder:text-muted-faint"
          />
        </div>
      </div>

      <button type="submit" disabled={pending} className="btn-primary mt-2 w-full">
        {pending ? "Creating…" : "Create account"}
      </button>
      <p className="text-center text-[12.5px] text-muted-faint">
        By continuing you agree to our{" "}
        <Link href="/terms" className="font-semibold text-magenta-brand">Terms</Link> &amp;{" "}
        <Link href="/privacy" className="font-semibold text-magenta-brand">Privacy Policy</Link>.
      </p>
      <p className="text-center text-sm text-muted-soft">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-magenta-brand">Sign in</Link>
      </p>
    </form>
  );
}
