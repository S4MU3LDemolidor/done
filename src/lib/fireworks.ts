import confetti from "canvas-confetti";

const COLORS = ["#FF6363", "#FF8F8F", "#59D499", "#FFB454", "#FFD166"];

/** Fogos de artifício centrados no elemento marcado. Maior quando concluído no prazo. */
export function fireworksAt(el: HTMLElement, onTime: boolean): void {
  const rect = el.getBoundingClientRect();
  confetti({
    particleCount: onTime ? 150 : 80,
    spread: onTime ? 100 : 70,
    startVelocity: 28,
    ticks: 120,
    origin: {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    },
    colors: COLORS,
    disableForReducedMotion: true,
  });
}
