interface IconProps {
  size?: number;
  className?: string;
}

function base(props: IconProps) {
  return {
    width: props.size ?? 17,
    height: props.size ?? 17,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: props.className,
  };
}

export function SunIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function CalendarIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M4 11h16" />
    </svg>
  );
}

export function CheckCircleIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 5-5.5" />
    </svg>
  );
}

export function UserIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20c.9-3.5 3.8-5 7-5s6.1 1.5 7 5" />
    </svg>
  );
}

export function TagIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 8V4h4l12 12-4 4L4 8Z" />
      <circle cx="8.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FlameIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 3s5 4.5 5 9.5a5 5 0 0 1-10 0c0-2 1-3.8 2-5 0 1.5 1 2.5 2 2.5C11 8 11 5 12 3Z" />
    </svg>
  );
}

export function GridIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function PlusIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function SparkleIcon(p: IconProps) {
  return (
    <svg {...base(p)} fill="currentColor" stroke="none">
      <path d="M12 2.5 14 9l6.5 2L14 13l-2 6.5L10 13l-6.5-2L10 9l2-6.5Z" />
    </svg>
  );
}

export function PencilIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17l-1 3ZM13.5 6.5l3 3" />
    </svg>
  );
}

export function TrashIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m3 0-1 13H7L6 7" />
    </svg>
  );
}

export function ChevronIcon(p: IconProps & { open?: boolean }) {
  return (
    <svg
      {...base(p)}
      style={{
        transform: p.open ? "rotate(90deg)" : undefined,
        transition: "transform 150ms ease",
      }}
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
