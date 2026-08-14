/**
 * Formatadores centrais do app (pt-BR / R$ / DD/MM/AAAA).
 * Toda exibição de dinheiro e data no app DEVE passar por aqui.
 */

const moedaBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dataBR = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

/** Converte valores vindos do Supabase (numeric chega como string) em number seguro. */
export function paraNumero(valor: number | string | null | undefined): number {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  if (typeof valor === "string") {
    const n = Number(valor);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Formata um valor monetário em Real brasileiro: 1200 -> "R$ 1.200,00". */
export function formatarBRL(valor: number | string | null | undefined): string {
  return moedaBRL.format(paraNumero(valor));
}

/**
 * Formata uma data em DD/MM/AAAA.
 * Aceita "AAAA-MM-DD" (formato do Postgres `date`) sem sofrer deslocamento
 * de fuso horário, além de Date e ISO completo.
 */
export function formatarData(valor: string | Date | null | undefined): string {
  if (!valor) return "—";

  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return "—";
    return dataBR.format(
      new Date(Date.UTC(valor.getFullYear(), valor.getMonth(), valor.getDate())),
    );
  }

  const somenteData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (somenteData) {
    return `${somenteData[3]}/${somenteData[2]}/${somenteData[1]}`;
  }

  const parsed = new Date(valor);
  if (Number.isNaN(parsed.getTime())) return "—";
  return dataBR.format(parsed);
}

export const MESES_PT_BR = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

/** Nome do mês (1-12). Retorna string vazia para valores fora da faixa. */
export function nomeDoMes(mes: number): string {
  return MESES_PT_BR[mes - 1] ?? "";
}
