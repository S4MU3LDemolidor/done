export interface Toast {
  id: number;
  emoji: string;
  title: string;
  sub?: string;
  action?: { label: string; run: () => void };
}

export function Toasts({
  toasts,
  onAction,
}: {
  toasts: Toast[];
  onAction: (toast: Toast) => void;
}) {
  return (
    <div className="pointer-events-none fixed right-5 bottom-12 z-50 flex flex-col items-end gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-toast-in pointer-events-auto flex items-center gap-3 rounded-xl border border-white/10 bg-raised px-4 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
        >
          <span className="text-[18px]">{t.emoji}</span>
          <div>
            <div className="text-[13px] font-semibold text-ink">{t.title}</div>
            {t.sub && <div className="text-[12px] text-dim">{t.sub}</div>}
          </div>
          {t.action && (
            <button
              onClick={() => onAction(t)}
              className="ml-1 rounded-md bg-white/[0.08] px-2.5 py-1 text-[12px] font-medium text-ink transition-colors duration-150 hover:bg-white/[0.14]"
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
