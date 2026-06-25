import type { AchievementId } from "../lib/types";

interface GlyphProps {
  size?: number;
  className?: string;
}

function svgProps(p: GlyphProps, color?: string) {
  return {
    width: p.size ?? 16,
    height: p.size ?? 16,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    className: p.className,
    style: color ? { color } : undefined,
  };
}

/* ----------------------------------------------------------------------------
 * Glifos de chip / toast — símbolo sólido, herda a cor via currentColor.
 * Substituem os emojis 📋 📅 🏷 ✦ 🗑 ⚠.
 * -------------------------------------------------------------------------- */

export function TaskGlyph(p: GlyphProps) {
  return (
    <svg {...svgProps(p)}>
      <rect x="5" y="4.5" width="14" height="16" rx="3.2" fill="currentColor" opacity="0.2" />
      <rect x="9" y="2.6" width="6" height="3.6" rx="1.4" fill="currentColor" />
      <path
        d="m8.4 13 2.6 2.6 5-5.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DateGlyph(p: GlyphProps) {
  return (
    <svg {...svgProps(p)}>
      <rect x="4" y="5" width="16" height="15" rx="3.2" fill="currentColor" opacity="0.2" />
      <path d="M4.6 9.5h14.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M8 3.4v3.2M16 3.4v3.2"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <circle cx="9" cy="13.5" r="1.4" fill="currentColor" />
      <circle cx="14.5" cy="13.5" r="1.4" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

export function TagGlyph(p: GlyphProps) {
  return (
    <svg {...svgProps(p)}>
      <path
        d="M11.4 3.4H20a.6.6 0 0 1 .6.6v8.6a1.4 1.4 0 0 1-.41.99l-7.2 7.2a1.4 1.4 0 0 1-1.98 0l-7.2-7.2a1.4 1.4 0 0 1 0-1.98l7.2-7.2c.26-.26.62-.41.99-.41Z"
        fill="currentColor"
        opacity="0.2"
      />
      <circle cx="16.6" cy="7.4" r="1.7" fill="currentColor" />
    </svg>
  );
}

export function SparkGlyph(p: GlyphProps) {
  return (
    <svg {...svgProps(p)}>
      <path
        d="M12 2.4c.4 3.3 1.9 4.8 5.2 5.2-3.3.4-4.8 1.9-5.2 5.2-.4-3.3-1.9-4.8-5.2-5.2 3.3-.4 4.8-1.9 5.2-5.2Z"
        fill="currentColor"
      />
      <path
        d="M18.5 13.5c.2 1.7 1 2.5 2.7 2.7-1.7.2-2.5 1-2.7 2.7-.2-1.7-1-2.5-2.7-2.7 1.7-.2 2.5-1 2.7-2.7Z"
        fill="currentColor"
        opacity="0.6"
      />
    </svg>
  );
}

export function TrashGlyph(p: GlyphProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M7 8.5h10l-.9 11a1.4 1.4 0 0 1-1.4 1.3H9.3a1.4 1.4 0 0 1-1.4-1.3L7 8.5Z" fill="currentColor" opacity="0.2" />
      <path d="M4.5 6.6h15" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path
        d="M9.4 6.4V5.1A1.3 1.3 0 0 1 10.7 3.8h2.6a1.3 1.3 0 0 1 1.3 1.3v1.3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M10.2 11v6M13.8 11v6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function NoteGlyph(p: GlyphProps) {
  return (
    <svg {...svgProps(p)}>
      {/* Corpo do documento */}
      <path
        d="M7 4h7l4 4v12a1.4 1.4 0 0 1-1.4 1.4H7A1.4 1.4 0 0 1 5.6 20V5.4A1.4 1.4 0 0 1 7 4Z"
        fill="currentColor"
        opacity="0.22"
      />
      {/* Dobra superior-direita */}
      <path d="M14 4v4h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Linhas de texto */}
      <path d="M8.5 12.5h7M8.5 15.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function FocusGlyph(p: GlyphProps) {
  return (
    <svg {...svgProps(p)}>
      <circle cx="12" cy="12" r="8.2" fill="currentColor" opacity="0.18" />
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.6" fill="none" opacity="0.5" />
      <circle cx="12" cy="12" r="4.4" stroke="currentColor" strokeWidth="1.7" fill="none" />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" />
    </svg>
  );
}

export function WarnGlyph(p: GlyphProps) {
  return (
    <svg {...svgProps(p)}>
      <path
        d="M10.7 4.3 3.3 18a1.5 1.5 0 0 0 1.3 2.2h14.8A1.5 1.5 0 0 0 20.7 18L13.3 4.3a1.5 1.5 0 0 0-2.6 0Z"
        fill="currentColor"
        opacity="0.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M12 10v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16.7" r="1.15" fill="currentColor" />
    </svg>
  );
}

/* ----------------------------------------------------------------------------
 * Selos de conquista — bloco arredondado + símbolo na cor do selo.
 * -------------------------------------------------------------------------- */

const BADGE_COLOR: Record<AchievementId, string> = {
  first_task: "#59D499",
  ten_tasks: "#FFB454",
  streak_7: "#FF6363",
  streak_30: "#FFD166",
  first_group: "#56C2FF",
  level_5: "#CF9EF1",
  deep_work: "#7C9CFF",
  flow: "#4EC8C8",
};

function badgeSymbol(id: AchievementId, color: string) {
  switch (id) {
    case "first_task": // broto
      return (
        <>
          <path d="M12 21v-8.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M12 14.5C8 14.5 5.4 12 5.4 8.2 9.4 8.2 12 10.7 12 14.5Z" fill={color} />
          <path d="M12.4 12.8C12.4 9.4 14.8 7 18.6 7 18.6 10.4 16.2 12.8 12.4 12.8Z" fill={color} opacity="0.8" />
        </>
      );
    case "ten_tasks": // raio
      return (
        <path
          d="M13.4 3 7 13h4.2l-1 8 6.8-10.5h-4.2L13.4 3Z"
          fill={color}
        />
      );
    case "streak_7": // chama
      return (
        <path
          d="M12 3c3 4.5 5 6.5 5 10a5 5 0 0 1-10 0c0-2 1-3.8 2-5 0 1.6 1 2.6 2 2.6C11 8 11 5.5 12 3Z"
          fill={color}
        />
      );
    case "streak_30": // troféu
      return (
        <>
          <path d="M8 4.5h8V9a4 4 0 0 1-8 0V4.5Z" fill={color} />
          <path d="M8 5.6H5.8a1.9 1.9 0 0 0 0 3.8H8" stroke={color} strokeWidth="1.6" fill="none" />
          <path d="M16 5.6h2.2a1.9 1.9 0 0 1 0 3.8H16" stroke={color} strokeWidth="1.6" fill="none" />
          <path d="M12 13v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <rect x="8.8" y="18.4" width="6.4" height="2.2" rx="1.1" fill={color} />
        </>
      );
    case "first_group": // pasta
      return (
        <path
          d="M3.8 7.2a2 2 0 0 1 2-2h3.1l2 2H18a2 2 0 0 1 2 2v7.4a2 2 0 0 1-2 2H5.8a2 2 0 0 1-2-2V7.2Z"
          fill={color}
        />
      );
    case "level_5": // foguete
      return (
        <>
          <path d="M12 3c3 3 4 7 4 10H8c0-3 1-7 4-10Z" fill={color} />
          <circle cx="12" cy="9" r="1.7" fill="#fff" opacity="0.92" />
          <path d="M8 13l-2 4 3-1.4Z" fill={color} opacity="0.85" />
          <path d="M16 13l2 4-3-1.4Z" fill={color} opacity="0.85" />
          <path d="M10.4 16 12 20.5 13.6 16Z" fill={color} opacity="0.7" />
        </>
      );
    case "deep_work": // alvo (concentração)
      return (
        <>
          <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.7" fill="none" opacity="0.55" />
          <circle cx="12" cy="12" r="4.4" stroke={color} strokeWidth="1.7" fill="none" />
          <circle cx="12" cy="12" r="1.7" fill={color} />
        </>
      );
    case "flow": // onda (fluxo)
      return (
        <>
          <path
            d="M3.5 10.5c2-2.6 4-2.6 6 0s4 2.6 6 0 4-2.6 5-1.3"
            stroke={color}
            strokeWidth="1.9"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M3.5 15c2-2.6 4-2.6 6 0s4 2.6 6 0 4-2.6 5-1.3"
            stroke={color}
            strokeWidth="1.9"
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
          />
        </>
      );
  }
}

export function AchievementBadge({
  id,
  size = 30,
  locked = false,
}: {
  id: AchievementId;
  size?: number;
  locked?: boolean;
}) {
  const color = BADGE_COLOR[id];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect
        x="1.5"
        y="1.5"
        width="21"
        height="21"
        rx="6.5"
        fill={locked ? "#ffffff" : color}
        opacity={locked ? 0.06 : 0.16}
      />
      {locked ? (
        <g stroke="#8a8a90" strokeWidth="1.7" fill="none">
          <rect x="7" y="11" width="10" height="8" rx="2.2" fill="#8a8a90" opacity="0.5" stroke="none" />
          <path d="M9 11V9a3 3 0 0 1 6 0v2" strokeLinecap="round" />
        </g>
      ) : (
        badgeSymbol(id, color)
      )}
    </svg>
  );
}
