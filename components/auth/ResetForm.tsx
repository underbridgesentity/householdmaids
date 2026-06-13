"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ResetState } from "@/app/actions/auth";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPasswordAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-3.5">
      <input type="hidden" name="token" value={token} />
      {state?.error && (
        <div className="rounded-2xl border border-[#f0d6d6] bg-[#fdf3f3] px-4 py-3 text-sm font-semibold text-[#d05656]">
          {state.error}
        </div>
      )}
      <label className="block">
        <span className="label">New password</span>
        <input name="password" type="password" required minLength={8} placeholder="At least 8 characters" className="field mt-1.5" />
      </label>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Updating…" : "Set new password"}
      </button>
    </form>
  );
}
