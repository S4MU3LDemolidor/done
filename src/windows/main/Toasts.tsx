export interface Toast {
  id: number;
  emoji: string;
  title: string;
  sub?: string;
}

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed right-5 bottom-5 z-50 flex flex-col items-end gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-toast-in flex items-center gap-3 rounded-xl border border-white/10 bg-raised px-4 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
        >
          <span className="text-[18px]">{t.emoji}</span>
          <div>
            <div className="text-[13px] font-semibold text-ink">{t.title}</div>
            {t.sub && <div className="text-[12px] text-dim">{t.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
