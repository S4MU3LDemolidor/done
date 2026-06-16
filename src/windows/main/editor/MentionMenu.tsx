import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { TaskGlyph } from "../../../components/glyphs";

export interface MentionItem {
  kind: "task" | "group";
  /** Task uuid or group name. */
  ref: string;
  /** Human-readable label shown in the chip and the menu row. */
  label: string;
  /** Resolved group color (only for groups) — passed in so the menu, which is
   *  rendered outside the React tree via ReactRenderer, needs no context. */
  color?: string;
}

export interface MentionMenuRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface MentionMenuProps {
  items: MentionItem[];
  /** Inserts the chosen item — wired to the suggestion `command`. */
  command: (item: MentionItem) => void;
}

/**
 * The frosted-glass dropdown rendered by the `@`-mention suggestion. Mirrors
 * SlashMenu: owns its own selection index and exposes an imperative `onKeyDown`
 * so the suggestion render layer can forward arrow/Enter keys from ProseMirror.
 */
export const MentionMenu = forwardRef<MentionMenuRef, MentionMenuProps>(
  ({ items, command }, ref) => {
    const [selected, setSelected] = useState(0);
    const selectedRef = useRef(selected);
    const listRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

    useEffect(() => {
      selectedRef.current = selected;
    });

    useEffect(() => {
      setSelected(0);
    }, [items]);

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
          setSelected((i) => {
            const next = items.length ? (i + 1) % items.length : 0;
            selectedRef.current = next;
            return next;
          });
          return true;
        }
        if (event.key === "ArrowUp") {
          setSelected((i) => {
            const next = items.length ? (i - 1 + items.length) % items.length : 0;
            selectedRef.current = next;
            return next;
          });
          return true;
        }
        if (event.key === "Enter") {
          select(selectedRef.current);
          return true;
        }
        return false;
      },
    }));

    return (
      <div
        ref={listRef}
        className="max-h-[280px] w-[256px] overflow-y-auto rounded-xl border border-white/10 bg-[rgba(30,30,34,0.92)] p-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl"
      >
        {items.length === 0 ? (
          <div className="px-3 py-2.5 text-[13px] text-faint">
            Nada encontrado
          </div>
        ) : (
          items.map((item, i) => {
            const active = i === selected;
            return (
              <button
                key={`${item.kind}:${item.ref}`}
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
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center">
                  {item.kind === "task" ? (
                    <TaskGlyph
                      size={16}
                      className={active ? "text-accent" : "text-dim"}
                    />
                  ) : (
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color ?? "var(--color-accent)" }}
                    />
                  )}
                </span>
                <span className="truncate">{item.label}</span>
                <span className="ml-auto shrink-0 text-[11px] text-faint">
                  {item.kind === "task" ? "tarefa" : "grupo"}
                </span>
              </button>
            );
          })
        )}
      </div>
    );
  },
);

MentionMenu.displayName = "MentionMenu";
