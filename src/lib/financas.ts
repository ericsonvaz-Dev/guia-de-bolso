import { Tables, Enums } from "@/integrations/supabase/types";

export type Lancamento = Tables<"lancamentos">;
export type ContaFixa = Tables<"contas_fixas">;
export type Parcela = Tables<"parcelas">;
export type Categoria = Tables<"categorias">;
export type TipoMovimento = Enums<"tipo_movimento">;
export type StatusLancamento = Enums<"status_lancamento">;

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
  lancamentosCompletos: (Lancamento & { virtual?: boolean; origin?: "fixa" | "parcela" })[];
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
  
  // Lista final contendo lançamentos reais + fixos virtuais
  const lancamentosCompletos: (Lancamento & { virtual?: boolean; origin?: "fixa" | "parcela" })[] = [...lancamentos];

  // Inicializar categorias para o mapa
  categorias.forEach((cat) => {
    gastosPorCategoria[cat.id] = { nome: cat.nome, total: 0, cor: cat.cor };
  });

  // 1. Processar Lançamentos Reais
  lancamentos.forEach((l) => {
    const valor = Number(l.valor);
    if (l.tipo === "receita") {
      totalReceitas += valor;
      if (l.status === "pago") {
        pagas += valor;
      }
      // Receitas pendentes não somam em "pendentes" (que deve ser focado em obrigações/despesas)
    } else {
      despesasManuais += valor;
      if (l.categoria_id) {
        const cat = gastosPorCategoria[l.categoria_id];
        if (cat) cat.total += valor;
      }
      if (l.status === "pago") {
        pagas += valor;
      } else {
        pendentes += valor;
      }
    }
  });

  // 2. Processar Contas Fixas Automáticas
  // Consideramos uma conta fixa como "já lançada" se houver um lançamento manual com a mesma descrição
  const descricoesLancadas = new Set(lancamentos.map(l => l.descricao.toLowerCase()));

  contasFixas.forEach((cf) => {
    if (cf.ativo && !descricoesLancadas.has(cf.descricao.toLowerCase())) {
      const valor = Number(cf.valor);
      totalContasFixas += valor;
      pendentes += valor;

      if (cf.categoria_id) {
        const cat = gastosPorCategoria[cf.categoria_id];
        if (cat) cat.total += valor;
      }

      // Adicionar como lançamento virtual para exibição na tela Mês
      lancamentosCompletos.push({
        id: `fixa-${cf.id}`,
        user_id: cf.user_id,
        descricao: cf.descricao,
        valor: cf.valor,
        tipo: "despesa",
        status: "pendente",
        categoria_id: cf.categoria_id,
        data: `${ano}-${String(mes).padStart(2, '0')}-${String(cf.dia).padStart(2, '0')}`,
        mes,
        ano,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        virtual: true,
        origin: "fixa"
      });
    }
  });

  // 3. Processar Parcelas Incidentes
  parcelas.forEach((p) => {
    if (calcularParcelaIncidente(p, mes, ano)) {
      const valor = Number(p.valor_parcela);
      totalParcelas += valor;
      pendentes += valor;

      if (p.categoria_id) {
        const cat = gastosPorCategoria[p.categoria_id];
        if (cat) cat.total += valor;
      }
      
      // Adicionar parcelas individualmente para exibição detalhada
      lancamentosCompletos.push({
        id: `parcela-${p.id}`,
        user_id: p.user_id,
        descricao: `Parcela: ${p.descricao}`,
        valor: p.valor_parcela,
        tipo: "despesa",
        status: "pendente",
        categoria_id: p.categoria_id,
        data: `${ano}-${String(mes).padStart(2, '0')}-01`, // Data simbólica (início do mês)
        mes,
        ano,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        virtual: true,
        origin: "parcela"
      });
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
    lancamentosCompletos,
  };
}
