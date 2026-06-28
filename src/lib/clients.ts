/** Grupos marcados como cliente → valor mensal em reais. Vazio = não é cliente. */
export type ClientMap = Record<string, number>;

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** "R$ 1.500" — pt-BR, sem centavos, normalizando o espaço inquebrável. */
export function formatBRL(value: number): string {
  return brl.format(value).replace(/\u00a0/g, " ");
}

export function totalMonthly(clients: ClientMap): number {
  return Object.values(clients).reduce((sum, v) => sum + v, 0);
}

export function clientCount(clients: ClientMap): number {
  return Object.keys(clients).length;
}
