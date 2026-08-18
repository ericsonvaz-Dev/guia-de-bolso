import { Tables } from "@/integrations/supabase/types";
import { paraNumero } from "./formatadores";

export type Lancamento = Tables<"lancamentos">;
export type ContaFixa = Tables<"contas_fixas">;
export type Parcela = Tables<"parcelas">;
export type PagamentoOcorrencia = Tables<"pagamentos_ocorrencia">;
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
  lancamentosCompletos: (Lancamento & { virtual?: boolean; origin?: "fixa" | "parcela"; pagamentosOcorrencia?: PagamentoOcorrencia | null })[];
}

export function calcularParcelaIncidente(parcela: Parcela, mes: number, ano: number): boolean {
  if (parcela.status !== "ativo") return false;
  const inicioAbs = (paraNumero(parcela.ano_inicio) * 12) + (paraNumero(parcela.mes_inicio) - 1);
  const atualAbs = (ano * 12) + (mes - 1);
  const fimAbs = inicioAbs + (paraNumero(parcela.num_parcelas) || 1) - 1;
  return atualAbs >= inicioAbs && atualAbs <= fimAbs;
}

export function processarResumoFinanceiro(
  lancamentos: Lancamento[],
  contasFixas: ContaFixa[],
  parcelas: Parcela[],
  pagamentosOcorrencia: PagamentoOcorrencia[],
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
  const lancamentosCompletos: (Lancamento & { virtual?: boolean; origin?: "fixa" | "parcela"; pagamentosOcorrencia?: PagamentoOcorrencia | null })[] = [...lancamentos.map(l => ({ ...l, pagamentosOcorrencia: null }))];

  categorias.forEach((cat) => {
    gastosPorCategoria[cat.id] = { nome: cat.nome, total: 0, cor: cat.cor };
  });

  lancamentos.forEach((l) => {
    const valor = paraNumero(l.valor);
    if (l.tipo === "receita") {
      totalReceitas += valor;
    } else {
      despesasManuais += valor;
      if (l.categoria_id) {
        const cat = gastosPorCategoria[l.categoria_id];
        if (cat) cat.total += valor;
      }
      if (l.status === "pago") pagas += valor; else pendentes += valor;
    }
  });

  contasFixas.forEach((cf) => {
    if (!cf.ativo) return;
    const valor = paraNumero(cf.valor);
    totalContasFixas += valor;
    const pagamento = pagamentosOcorrencia.find(p => p.origem === 'fixa' && p.origem_id === cf.id);
    
    if (pagamento?.pago) {
        pagas += valor;
    } else {
        pendentes += valor;
    }

    if (cf.categoria_id) {
        const cat = gastosPorCategoria[cf.categoria_id];
        if (cat) cat.total += valor;
    }

    lancamentosCompletos.push({
        id: `fixa-${cf.id}`,
        user_id: cf.user_id,
        descricao: cf.descricao ?? "Conta Fixa",
        valor: cf.valor,
        tipo: "despesa",
        status: pagamento?.pago ? "pago" : "pendente",
        categoria_id: cf.categoria_id,
        data: `${ano}-${String(mes).padStart(2, '0')}-${String(paraNumero(cf.dia) || 1).padStart(2, '0')}`,
        mes,
        ano,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        virtual: true,
        origin: "fixa",
        pagamentosOcorrencia: pagamento ?? null
    });
  });

  parcelas.forEach((p) => {
    if (calcularParcelaIncidente(p, mes, ano)) {
      const valor = paraNumero(p.valor_parcela);
      totalParcelas += valor;
      const pagamento = pagamentosOcorrencia.find(p_occ => p_occ.origem === 'parcela' && p_occ.origem_id === p.id);
      
      if (pagamento?.pago) pagas += valor; else pendentes += valor;

      if (p.categoria_id) {
        const cat = gastosPorCategoria[p.categoria_id];
        if (cat) cat.total += valor;
      }
      
      lancamentosCompletos.push({
        id: `parcela-${p.id}`,
        user_id: p.user_id,
        descricao: `Parcela: ${p.descricao ?? "Sem descrição"}`,
        valor: p.valor_parcela,
        tipo: "despesa",
        status: pagamento?.pago ? "pago" : "pendente",
        categoria_id: p.categoria_id,
        data: `${ano}-${String(mes).padStart(2, '0')}-01`,
        mes,
        ano,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        virtual: true,
        origin: "parcela",
        pagamentosOcorrencia: pagamento ?? null
      });
    }
  });

  return {
    totalReceitas,
    despesasManuais,
    totalContasFixas,
    totalParcelas,
    totalDespesas: despesasManuais + totalContasFixas + totalParcelas,
    saldo: totalReceitas - (despesasManuais + totalContasFixas + totalParcelas),
    percentGasto: totalReceitas > 0 ? (despesasManuais + totalContasFixas + totalParcelas) / totalReceitas : 0,
    pagas,
    pendentes,
    gastosPorCategoria,
    lancamentosCompletos,
  };
}
