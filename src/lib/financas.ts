import { Tables } from "@/integrations/supabase/types";

export type Lancamento = Tables<"lancamentos">;
export type ContaFixa = Tables<"contas_fixas">;
export type Parcela = Tables<"parcelas">;
export type Categoria = Tables<"categorias">;

export interface ResumoFinanceiro {
  totalReceitas: number;
  despesasManuais: number;
  totalContasFixas: number;
  totalParcelas: number;
  totalDespesas: number;
  saldo: number;
  percentGasto: number;
  pagas: number;
  pendentes: number;
  gastosPorCategoria: Record<string, { nome: string; total: number; cor: string }>;
}

/**
 * Calcula se uma parcela incide em um determinado mês e ano usando a lógica do índice absoluto.
 */
export function calcularParcelaIncidente(
  parcela: Parcela,
  mes: number,
  ano: number
): boolean {
  if (parcela.status !== "ativo") return false;

  const inicioAbs = parcela.ano_inicio * 12 + (parcela.mes_inicio - 1); // 0-indexed month
  const atualAbs = ano * 12 + (mes - 1);
  const fimAbs = inicioAbs + (parcela.num_parcelas || 1) - 1;

  return atualAbs >= inicioAbs && atualAbs <= fimAbs;
}

/**
 * Processa os dados brutos do Supabase e retorna o resumo consolidado.
 */
export function processarResumoFinanceiro(
  lancamentos: Lancamento[],
  contasFixas: ContaFixa[],
  parcelas: Parcela[],
  categorias: Categoria[],
  mes: number,
  ano: number
): ResumoFinanceiro {
  let totalReceitas = 0;
  let despesasManuais = 0;
  let totalContasFixas = 0;
  let totalParcelas = 0;
  let pagas = 0;
  let pendentes = 0;
  const gastosPorCategoria: Record<string, { nome: string; total: number; cor: string }> = {};

  // Inicializar categorias para o mapa
  categorias.forEach((cat) => {
    gastosPorCategoria[cat.id] = { nome: cat.nome, total: 0, cor: cat.cor };
  });

  // 1. Processar Lançamentos Reais
  lancamentos.forEach((l) => {
    const valor = Number(l.valor);
    if (l.tipo === "receita") {
      totalReceitas += valor;
    } else {
      despesasManuais += valor;
      if (l.categoria_id && gastosPorCategoria[l.categoria_id]) {
        gastosPorCategoria[l.categoria_id].total += valor;
      }
    }

    if (l.status === "pago") {
      pagas += valor;
    } else {
      pendentes += valor;
    }
  });

  // 2. Processar Contas Fixas Automáticas
  // Consideramos apenas as que não foram lançadas manualmente no mês (por descrição exata)
  const descricoesLancadas = new Set(lancamentos.map(l => l.descricao.toLowerCase()));

  contasFixas.forEach((cf) => {
    if (cf.ativo && !descricoesLancadas.has(cf.descricao.toLowerCase())) {
      const valor = Number(cf.valor);
      totalContasFixas += valor;
      pendentes += valor;

      if (cf.categoria_id && gastosPorCategoria[cf.categoria_id]) {
        gastosPorCategoria[cf.categoria_id].total += valor;
      }
    }
  });

  // 3. Processar Parcelas Incidentes
  parcelas.forEach((p) => {
    if (calcularParcelaIncidente(p, mes, ano)) {
      const valor = Number(p.valor_parcela);
      totalParcelas += valor;
      pendentes += valor; // Parcelas virtuais começam como pendentes

      if (p.categoria_id && gastosPorCategoria[p.categoria_id]) {
        gastosPorCategoria[p.categoria_id].total += valor;
      }
    }
  });

  const totalDespesas = despesasManuais + totalContasFixas + totalParcelas;
  const saldo = totalReceitas - totalDespesas;
  const percentGasto = totalReceitas > 0 ? totalDespesas / totalReceitas : 0;

  return {
    totalReceitas,
    despesasManuais,
    totalContasFixas,
    totalParcelas,
    totalDespesas,
    saldo,
    percentGasto,
    pagas,
    pendentes,
    gastosPorCategoria,
  };
}
