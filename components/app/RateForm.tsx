"use client";

import { useState } from "react";
import { submitReviewAction } from "@/app/actions/booking";

const TAGS = ["Punctual", "Thorough", "Friendly", "Professional"];

export function RateForm({ bookingId, helperName }: { bookingId: string; helperName: string }) {
  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState<string[]>([]);

  return (
    <form action={submitReviewAction} className="flex min-h-screen flex-col md:min-h-0 md:h-full">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="stars" value={rating} />
      {tags.map((t) => <input key={t} type="hidden" name="tags" value={t} />)}

      <div className="flex-1 px-5 py-3.5 text-center">
        <div className="mx-auto my-4 flex h-[84px] w-[84px] items-center justify-center rounded-full bg-gradient-to-br from-[#cdbce4] to-[#e6d4ef] font-display text-3xl font-bold text-indigo-brand">{helperName[0]}</div>
        <div className="font-display text-lg font-bold">How was {helperName.split(" ")[0]}?</div>
        <div className="mb-5 mt-1.5 text-[13.5px] text-muted">Your rating keeps our team excellent.</div>

        <div className="mb-6 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" key={n} onClick={() => setRating(n)} className={`text-[40px] leading-none ${n <= rating ? "text-[#E8A33D]" : "text-[#dcd4e6]"}`}>
              {n <= rating ? "★" : "☆"}
            </button>
          ))}
        </div>

        <textarea name="note" maxLength={500} placeholder="Add a note (optional)…" className="field min-h-[96px] resize-none" />

        <div className="mt-3.5 flex flex-wrap justify-center gap-2.5">
          {TAGS.map((t) => {
            const sel = tags.includes(t);
            return (
              <button type="button" key={t} onClick={() => setTags((c) => (sel ? c.filter((x) => x !== t) : [...c, t]))} className={`rounded-full px-3.5 py-2 text-[12.5px] font-semibold ${sel ? "bg-magenta-brand text-white" : "bg-surface-lav text-muted-label"}`}>{t}</button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-[#ece6f3] bg-white px-[18px] pb-[18px] pt-3.5">
        <button type="submit" className="btn-primary w-full">Submit review</button>
      </div>
    </form>
  );
}
