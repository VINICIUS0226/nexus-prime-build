export type CorreiosService = 'pac' | 'sedex' | 'sedex10';

export type CorreiosEstimate = {
  price: number;
  prazoMin: number; // em dias
  prazoMax: number; // em dias
};

const normalizeText = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

const normalizeCity = (value: string | null | undefined) => {
  if (!value) return '';
  return normalizeText(value);
};

/**
 * Estimativa "simple" determinística (sem WebService).
 * - Peso: kg total = pesoItemKgPadrao * quantidade
 * - Mesma UF/Cidade: reduz preço e prazo
 *
 * Observacao: isso e uma aproximação para a UI do portal.
 * Depois podemos trocar por uma integração real, se você quiser.
 */
export function estimateCorreios(service: CorreiosService, weightKg: number, sameUF: boolean, sameCity: boolean): CorreiosEstimate {
  const w = Math.max(0.1, Number(weightKg) || 0);

  const factors = {
    pac: { base: 12, perKg: 7, prazoBaseMin: 3, prazoBaseMax: 6, ufDiscount: 0.85, cityDiscount: 0.7 },
    sedex: { base: 18, perKg: 10, prazoBaseMin: 2, prazoBaseMax: 4, ufDiscount: 0.85, cityDiscount: 0.72 },
    sedex10: { base: 25, perKg: 14, prazoBaseMin: 1, prazoBaseMax: 2, ufDiscount: 0.9, cityDiscount: 0.78 },
  } as const;

  const cfg = factors[service];
  const discount = sameCity ? cfg.cityDiscount : sameUF ? cfg.ufDiscount : 1;

  const price = (cfg.base + cfg.perKg * w) * discount;

  const prazoMin = sameCity
    ? Math.max(1, Math.round(cfg.prazoBaseMin * 0.6 + w * 0.15))
    : sameUF
      ? Math.max(1, Math.round(cfg.prazoBaseMin * 0.8 + w * 0.2))
      : Math.max(1, Math.round(cfg.prazoBaseMin + w * 0.25));

  const prazoMax = sameCity
    ? Math.max(prazoMin, Math.round(cfg.prazoBaseMax * 0.7 + w * 0.2))
    : sameUF
      ? Math.max(prazoMin, Math.round(cfg.prazoBaseMax * 0.85 + w * 0.25))
      : Math.max(prazoMin, Math.round(cfg.prazoBaseMax + w * 0.3));

  return {
    price: Number(price.toFixed(2)),
    prazoMin,
    prazoMax,
  };
}

export { normalizeCity };

