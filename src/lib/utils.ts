import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata número de telefone brasileiro para exibição.
 * Suporta 10 dígitos (fixo), 11 dígitos (celular) e prefixo 55.
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "-";
  let value = String(phone).replace(/\D/g, "");
  if (value.length === 0) return "-";
  if (value.length === 13 && value.startsWith("55")) {
    value = value.substring(2);
  }
  if (value.length >= 11) {
    return value.replace(/(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
  }
  if (value.length >= 10) {
    return value.replace(/(\d{2})(\d{4})(\d{4}).*/, "($1) $2-$3");
  }
  return value;
}
