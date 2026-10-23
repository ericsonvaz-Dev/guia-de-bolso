import { Enums, Tables } from "@/integrations/supabase/types";
import { paraNumero } from "./formatadores";

export type MovimentoInvestimento = Tables<"investimentos">;
export type TipoAtivo = Enums<"tipo_ativo">;

export const TIPOS_ATIVO: { valor: TipoAtivo; rotulo: string }[] = [
  { valor: "renda_fixa", rotulo: "Renda fixa (CDB, LCI, LCA...)" },
  { valor: "tesouro", rotulo: "Tesouro Direto" },
  { valor: "acoes", rotulo: "Ações" },
  { valor: "fiis", rotulo: "Fundos imobiliários (FIIs)" },
  { valor: "fundos", rotulo: "Fundos de investimento" },
  { valor: "cripto", rotulo: "Criptomoedas" },
  { valor: "previdencia", rotulo: "Previdência privada" },
  { valor: "outros", rotulo: "Outros" },
];

export function rotuloTipoAtivo(tipo: TipoAtivo): string {
  return TIPOS_ATIVO.find((t) => t.valor === tipo)?.rotulo ?? "Outros";
}

export interface Posicao {
  chave: string;
  nome: string;
  instituicao: string;
  tipoAtivo: TipoAtivo;
  aportado: number;
  resgatado: number;
  /** Aportes menos resgates, nunca negativo (um resgate pode incluir rendimento). */
  investido: number;
}

export interface GrupoInvestimento {
  rotulo: string;
  total: number;
  parte: number;
}

export interface MesInvestimento {
  chave: string;
  ano: number;
  mes: number;
  aportado: number;
  resgatado: number;
}

export interface ResumoInvestimentos {
  totalInvestido: number;
  totalAportado: number;
  totalResgatado: number;
  posicoes: Posicao[];
  porTipo: GrupoInvestimento[];
  porInstituicao: GrupoInvestimento[];
  ultimosMeses: MesInvestimento[];
}

const normalizar = (s: string) => s.trim().toLocaleLowerCase("pt-BR");

function agrupar(posicoes: Posicao[], total: number, rotulo: (p: Posicao) => string) {
  const mapa = new Map<string, number>();
  posicoes.forEach((p) => mapa.set(rotulo(p), (mapa.get(rotulo(p)) ?? 0) + p.investido));
  return [...mapa.entries()]
    .map(([r, t]) => ({ rotulo: r, total: t, parte: total > 0 ? t / total : 0 }))
    .sort((a, b) => b.total - a.total);
}

/** Mês de referência (1-12) e ano de uma data "AAAA-MM-DD", sem depender de fuso horário. */
function mesEAno(data: string) {
  return { ano: Number(data.slice(0, 4)), mes: Number(data.slice(5, 7)) };
}

export function resumirInvestimentos(
  movimentos: MovimentoInvestimento[],
  mesReferencia: number,
  anoReferencia: number,
  quantidadeMeses = 6,
): ResumoInvestimentos {
  const posicoesPorChave = new Map<string, Posicao>();
  let totalAportado = 0;
  let totalResgatado = 0;

  movimentos.forEach((m) => {
    const valor = paraNumero(m.valor);
    const chave = `${normalizar(m.nome)}|${normalizar(m.instituicao)}`;
    const posicao = posicoesPorChave.get(chave) ?? {
      chave,
      nome: m.nome.trim(),
      instituicao: m.instituicao.trim(),
      tipoAtivo: m.tipo_ativo,
      aportado: 0,
      resgatado: 0,
      investido: 0,
    };
    if (m.movimento === "aporte") {
      posicao.aportado += valor;
      totalAportado += valor;
    } else {
      posicao.resgatado += valor;
      totalResgatado += valor;
    }
    posicoesPorChave.set(chave, posicao);
  });

  const posicoes = [...posicoesPorChave.values()]
    .map((p) => ({ ...p, investido: Math.max(0, p.aportado - p.resgatado) }))
    .filter((p) => p.investido > 0)
    .sort((a, b) => b.investido - a.investido);

  const totalInvestido = posicoes.reduce((acc, p) => acc + p.investido, 0);

  const ultimosMeses: MesInvestimento[] = [];
  const indiceRef = anoReferencia * 12 + (mesReferencia - 1);
  for (let i = quantidadeMeses - 1; i >= 0; i--) {
    const idx = indiceRef - i;
    const ano = Math.floor(idx / 12);
    const mes = (idx % 12) + 1;
    ultimosMeses.push({ chave: `${ano}-${mes}`, ano, mes, aportado: 0, resgatado: 0 });
  }
  movimentos.forEach((m) => {
    const { ano, mes } = mesEAno(m.data);
    const alvo = ultimosMeses.find((x) => x.ano === ano && x.mes === mes);
    if (!alvo) return;
    if (m.movimento === "aporte") alvo.aportado += paraNumero(m.valor);
    else alvo.resgatado += paraNumero(m.valor);
  });

  return {
    totalInvestido,
    totalAportado,
    totalResgatado,
    posicoes,
    porTipo: agrupar(posicoes, totalInvestido, (p) => rotuloTipoAtivo(p.tipoAtivo)),
    porInstituicao: agrupar(posicoes, totalInvestido, (p) => p.instituicao),
    ultimosMeses,
  };
}
