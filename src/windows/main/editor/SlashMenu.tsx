import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { SlashItem } from "./SlashCommands";

export interface SlashMenuRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface SlashMenuProps {
  items: SlashItem[];
  /** Selects an item by index — wired to the suggestion `command`. */
  command: (item: SlashItem) => void;
}

/**
 * The frosted-glass dropdown rendered by the slash-command suggestion.
 * Owns its own selection index and exposes an imperative `onKeyDown` so the
 * suggestion render layer can forward arrow/Enter/Escape keys from ProseMirror.
 */
export const SlashMenu = forwardRef<SlashMenuRef, SlashMenuProps>(
  ({ items, command }, ref) => {
    const [selected, setSelected] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

    // Reset the selection whenever the filtered list changes.
    useEffect(() => {
      setSelected(0);
    }, [items]);

    // Keep the highlighted row in view as the user arrows through.
    useLayoutEffect(() => {
      itemRefs.current[selected]?.scrollIntoView({ block: "nearest" });
    }, [selected]);

    const select = (index: number) => {
      const item = items[index];
      if (item) command(item);
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: (event) => {
        if (event.key === "ArrowDown") {
          setSelected((i) => (items.length ? (i + 1) % items.length : 0));
          return true;
        }
        if (event.key === "ArrowUp") {
          setSelected((i) =>
            items.length ? (i - 1 + items.length) % items.length : 0,
          );
          return true;
        }
        if (event.key === "Enter") {
          select(selected);
          return true;
        }
        return false;
      },
    }));

    return (
      <div
        ref={listRef}
        className="max-h-[280px] w-[232px] overflow-y-auto rounded-xl border border-white/10 bg-[rgba(30,30,34,0.92)] p-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl"
      >
        {items.length === 0 ? (
          <div className="px-3 py-2.5 text-[13px] text-faint">Nenhum bloco</div>
        ) : (
          items.map((item, i) => {
            const Glyph = item.glyph;
            const active = i === selected;
            return (
              <button
                key={item.key}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                onMouseEnter={() => setSelected(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(i);
                }}
                className={`flex h-[34px] w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] transition-colors duration-100 ${
                  active ? "bg-accent-dim text-accent" : "text-ink"
                }`}
              >
                <span
                  className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border ${
                    active
                      ? "border-accent/30 bg-accent/10"
                      : "border-white/10 bg-white/[0.04]"
                  }`}
                >
                  <Glyph size={14} />
                </span>
                <span className="truncate">{item.title}</span>
              </button>
            );
          })
        )}
      </div>
    );
  },
);

SlashMenu.displayName = "SlashMenu";
