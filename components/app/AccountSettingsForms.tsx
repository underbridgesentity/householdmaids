"use client";

import { useActionState } from "react";
import { updateProfileAction, changePasswordAction, type ProfileState } from "@/app/actions/profile";

export function AccountSettingsForms({
  fullName,
  email,
  phone,
}: {
  fullName: string;
  email: string;
  phone: string;
}) {
  const [profileState, profileAction, profilePending] = useActionState<ProfileState, FormData>(updateProfileAction, undefined);
  const [pwState, pwAction, pwPending] = useActionState<ProfileState, FormData>(changePasswordAction, undefined);

  return (
    <div className="flex flex-col gap-4 px-[18px] pb-6">
      {/* Personal details */}
      <form action={profileAction} className="card flex flex-col gap-3 p-4">
        <div className="font-display text-[15px] font-bold">Personal details</div>
        <label className="flex flex-col gap-1">
          <span className="label">Full name</span>
          <input name="fullName" defaultValue={fullName} required className="field bg-white" autoComplete="name" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Email</span>
          <input name="email" type="email" defaultValue={email} required className="field bg-white" autoComplete="email" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Mobile number</span>
          <input name="phone" type="tel" defaultValue={phone} placeholder="Optional" className="field bg-white" autoComplete="tel" />
        </label>
        {profileState?.error && <Msg error>{profileState.error}</Msg>}
        {profileState?.ok && <Msg>Saved.</Msg>}
        <button type="submit" disabled={profilePending} className="btn-primary mt-1 w-full disabled:opacity-50">
          {profilePending ? "Saving…" : "Save details"}
        </button>
      </form>

      {/* Change password */}
      <form action={pwAction} className="card flex flex-col gap-3 p-4">
        <div className="font-display text-[15px] font-bold">Change password</div>
        <label className="flex flex-col gap-1">
          <span className="label">Current password</span>
          <input name="currentPassword" type="password" required className="field bg-white" autoComplete="current-password" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">New password</span>
          <input name="newPassword" type="password" required minLength={8} className="field bg-white" autoComplete="new-password" placeholder="At least 8 characters" />
        </label>
        {pwState?.error && <Msg error>{pwState.error}</Msg>}
        {pwState?.ok && <Msg>Password updated.</Msg>}
        <button type="submit" disabled={pwPending} className="btn-primary mt-1 w-full disabled:opacity-50">
          {pwPending ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

function Msg({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return (
    <div
      className={
        error
          ? "rounded-xl border border-[#f0d6d6] bg-[#fdf3f3] px-3.5 py-2.5 text-[13px] font-semibold text-[#d05656]"
          : "rounded-xl border border-[#cfe8d8] bg-[#eef6f0] px-3.5 py-2.5 text-[13px] font-semibold text-money-dark"
      }
    >
      {children}
    </div>
  );
}
