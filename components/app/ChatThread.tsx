import { sendMessageAction } from "@/app/actions/booking";

type Msg = { id: string; body: string; mine: boolean; time: string };

/** Shared chat thread (customer + helper). Posts via a server action. */
export function ChatThread({
  bookingId, otherName, online, messages, backHref,
}: {
  bookingId: string; otherName: string; online?: boolean; messages: Msg[]; backHref: string;
}) {
  return (
    <div className="flex h-screen flex-col md:h-full">
      <div className="flex items-center gap-3 border-b border-line bg-white px-4 pb-3.5 pt-2">
        <a href={backHref} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-surface-lav text-lg text-indigo-brand">‹</a>
        <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-gradient-to-br from-[#cdbce4] to-[#e6d4ef] font-display font-bold text-indigo-brand">{otherName[0]}</div>
        <div className="flex-1">
          <div className="font-display text-[15px] font-bold">{otherName}</div>
          {online && <div className="text-[11.5px] text-money">● Online</div>}
        </div>
      </div>

      <div className="hm-scroll flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        <div className="text-center text-[11px] text-muted-faint">Today</div>
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[76%] rounded-2xl px-3.5 py-2.5 text-sm leading-snug ${m.mine ? "rounded-br-md bg-brand-gradient text-white" : "rounded-bl-md bg-[#f1ecf7] text-ink"}`}>
              {m.body}
              <div className={`mt-1 text-right text-[10px] ${m.mine ? "text-white/70" : "text-muted-faint"}`}>{m.time}</div>
            </div>
          </div>
        ))}
        {messages.length === 0 && <div className="mt-6 text-center text-[13px] text-muted">Say hello 👋</div>}
      </div>

      <form action={sendMessageAction} className="flex items-center gap-2.5 border-t border-line bg-white px-3.5 py-3">
        <input type="hidden" name="bookingId" value={bookingId} />
        <input name="body" required autoComplete="off" placeholder={`Message ${otherName.split(" ")[0]}…`} className="flex-1 rounded-full border-[1.5px] border-line-input bg-[#faf8fc] px-4 py-3 text-[14.5px] outline-none focus:border-magenta-brand" />
        <button type="submit" aria-label="Send message" className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-gradient text-lg text-white">➤</button>
      </form>
    </div>
  );
}
