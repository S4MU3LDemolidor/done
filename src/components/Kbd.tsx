export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-[4px] bg-white/[0.09] px-1.5 py-0.5 text-[10px] font-medium text-dim">
      {children}
    </kbd>
  );
}
