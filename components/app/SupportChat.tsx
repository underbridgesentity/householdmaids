import { Send } from "lucide-react";

export type ChatMsg = { id: string; body: string; mine: boolean; time: string; senderLabel?: string };

/**
 * Shared support chat thread. Used by the customer, the helper, and the admin
 * (with their own server action + "mine" perspective). Presentational only.
 */
export function SupportChat({
  title, subtitle, avatar, messages, action, threadId, backHref, placeholder = "Type a message…", emptyHint = "Send us a message and the Household Maids team will reply here.",
}: {
  title: string;
  subtitle?: string;
  avatar: string;
  messages: ChatMsg[];
  action: (formData: FormData) => void | Promise<void>;
  threadId?: string;
  backHref?: string;
  placeholder?: string;
  emptyHint?: string;
}) {
  return (
    <div className="flex h-[100dvh] flex-col md:h-full">
      <div className="flex items-center gap-3 border-b border-line bg-white px-4 pb-3.5 pt-2">
        {backHref && <a href={backHref} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-surface-lav text-lg text-indigo-brand">‹</a>}
        <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-brand-gradient font-display text-[15px] font-bold text-white">{avatar}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[15px] font-bold text-ink">{title}</div>
          {subtitle && <div className="truncate text-[11.5px] text-muted-faint">{subtitle}</div>}
        </div>
      </div>

      <div className="hm-scroll flex flex-1 flex-col gap-2.5 overflow-y-auto bg-[#faf8fc] p-4">
        {messages.length === 0 && <div className="mx-auto mt-8 max-w-[260px] text-center text-[13px] text-muted">{emptyHint}</div>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-snug shadow-sm ${m.mine ? "rounded-br-md bg-brand-gradient text-white" : "rounded-bl-md bg-white text-ink"}`}>
              {m.senderLabel && !m.mine && <div className="mb-0.5 text-[10.5px] font-bold text-magenta-brand">{m.senderLabel}</div>}
              {m.body}
              <div className={`mt-1 text-right text-[10px] ${m.mine ? "text-white/70" : "text-muted-faint"}`}>{m.time}</div>
            </div>
          </div>
        ))}
      </div>

      <form action={action} className="flex items-center gap-2.5 border-t border-line bg-white px-3.5 py-3">
        {threadId && <input type="hidden" name="threadId" value={threadId} />}
        <input name="body" required autoComplete="off" placeholder={placeholder} className="flex-1 rounded-full border-[1.5px] border-line-input bg-[#faf8fc] px-4 py-3 text-[14.5px] outline-none focus:border-magenta-brand" />
        <button type="submit" aria-label="Send message" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white"><Send size={18} strokeWidth={2.2} /></button>
      </form>
    </div>
  );
}
