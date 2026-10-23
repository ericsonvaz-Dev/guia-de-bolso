import { formatarBRL, nomeDoMes, paraNumero } from "./formatadores";
import {
  situacaoParcela,
  type GrupoPagamento,
  type Parcela,
  type ResumoFinanceiro,
} from "./financas";

export const ROTULO_GRUPO_PAGAMENTO: Record<GrupoPagamento, string> = {
  credito: "Cartão de crédito",
  debito: "Cartão de débito",
  dinheiro_pix: "Dinheiro / Pix",
  fixa: "Contas fixas",
  nao_informado: "Sem forma informada",
};

export interface CategoriaAnalisada {
  id: string;
  nome: string;
  cor: string;
  total: number;
  /** % das despesas do mês (0 a 1). */
  parteDasDespesas: number;
  /** % da renda do mês (0 a 1). Zero se não houve receita. */
  parteDaRenda: number;
  /** Variação em R$ contra o mês anterior. undefined se não há mês anterior para comparar. */
  variacao?: number | undefined;
}

export interface GastoIndividual {
  id: string;
  descricao: string;
  valor: number;
  origem: "manual" | "fixa" | "parcela";
  categoria: string;
}

export interface Dica {
  id: string;
  nivel: "alta" | "media" | "info";
  titulo: string;
  /** Por que isso importa, com os números do mês. */
  explicacao: string;
  /** O que fazer na prática. */
  acao: string;
  /** Economia mensal estimada, quando faz sentido calcular. */
  economiaMensal?: number | undefined;
}

const LIMITE_CATEGORIA_DOMINANTE = 0.3;
const LIMITE_PARCELAS_RENDA = 0.3;
const LIMITE_FIXAS_RENDA = 0.5;
const LIMITE_CREDITO_DESPESAS = 0.5;
const REDUCAO_SUGERIDA = 0.1;

export function categoriasAnalisadas(
  atual: ResumoFinanceiro,
  anterior?: ResumoFinanceiro,
): CategoriaAnalisada[] {
  return Object.entries(atual.gastosPorCategoria)
    .filter(([, c]) => c.total > 0)
    .map(([id, c]) => ({
      id,
      nome: c.nome,
      cor: c.cor,
      total: c.total,
      parteDasDespesas: atual.totalDespesas > 0 ? c.total / atual.totalDespesas : 0,
      parteDaRenda: atual.totalReceitas > 0 ? c.total / atual.totalReceitas : 0,
      variacao: anterior ? c.total - (anterior.gastosPorCategoria[id]?.total ?? 0) : undefined,
    }))
    .sort((a, b) => b.total - a.total);
}

export function maioresGastos(atual: ResumoFinanceiro, limite = 5): GastoIndividual[] {
  return atual.lancamentosCompletos
    .filter((l) => l.tipo === "despesa")
    .map((l) => ({
      id: l.id,
      descricao: l.descricao,
      valor: paraNumero(l.valor),
      origem: (l.origin ?? "manual") as GastoIndividual["origem"],
      categoria: atual.gastosPorCategoria[l.categoria_id ?? ""]?.nome ?? "Sem categoria",
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, limite);
}

export function gerarDicas(
  atual: ResumoFinanceiro,
  anterior: ResumoFinanceiro | undefined,
  parcelas: Parcela[],
  mes: number,
  ano: number,
): Dica[] {
  const dicas: Dica[] = [];
  const { totalReceitas, totalDespesas, saldo } = atual;
  const categorias = categoriasAnalisadas(atual, anterior);

  if (totalDespesas === 0) return dicas;

  // 1. Gastando mais do que ganha.
  if (saldo < 0) {
    const maior = categorias[0];
    dicas.push({
      id: "saldo-negativo",
      nivel: "alta",
      titulo: "Você gastou mais do que recebeu",
      explicacao: `As despesas (${formatarBRL(totalDespesas)}) passaram da renda (${formatarBRL(totalReceitas)}) em ${formatarBRL(-saldo)}.`,
      acao: maior
        ? `Para fechar o mês no zero, corte ${formatarBRL(-saldo)}. O ponto mais fácil para começar é "${maior.nome}", sua maior categoria.`
        : `Para fechar o mês no zero, corte ${formatarBRL(-saldo)} das despesas.`,
      economiaMensal: -saldo,
    });
  }

  // 2. Uma categoria domina o orçamento.
  const maior = categorias[0];
  if (maior && maior.parteDasDespesas >= LIMITE_CATEGORIA_DOMINANTE) {
    const economia = maior.total * REDUCAO_SUGERIDA;
    dicas.push({
      id: "categoria-dominante",
      nivel: "media",
      titulo: `"${maior.nome}" pesa demais no orçamento`,
      explicacao: `Essa categoria sozinha é ${Math.round(maior.parteDasDespesas * 100)}% de tudo o que você gastou (${formatarBRL(maior.total)}).`,
      acao: `Revise os lançamentos de "${maior.nome}" e veja o que dá para cortar ou trocar por algo mais barato. Reduzir só 10% já libera ${formatarBRL(economia)} por mês (${formatarBRL(economia * 12)} no ano).`,
      economiaMensal: economia,
    });
  }

  // 3. Categorias que cresceram em relação ao mês anterior.
  categorias
    .filter((c) => c.variacao !== undefined && c.variacao >= 50)
    .filter((c) => {
      const antes = c.total - (c.variacao ?? 0);
      return antes <= 0 || (c.variacao ?? 0) / antes >= 0.2;
    })
    .slice(0, 2)
    .forEach((c) => {
      dicas.push({
        id: `alta-${c.id}`,
        nivel: "media",
        titulo: `"${c.nome}" subiu em relação ao mês passado`,
        explicacao: `Você gastou ${formatarBRL(c.variacao)} a mais que no mês anterior nessa categoria (agora ${formatarBRL(c.total)}).`,
        acao: `Confira se foi um gasto pontual ou um hábito novo. Se for hábito, voltar ao nível anterior economiza ${formatarBRL(c.variacao)} por mês.`,
        economiaMensal: c.variacao,
      });
    });

  // 4. Parcelas comprometendo a renda.
  if (totalReceitas > 0 && atual.totalParcelas / totalReceitas >= LIMITE_PARCELAS_RENDA) {
    dicas.push({
      id: "parcelas-altas",
      nivel: "alta",
      titulo: "As parcelas do cartão comprometem boa parte da renda",
      explicacao: `Neste mês, ${formatarBRL(atual.totalParcelas)} já estão presos em parcelas, o que é ${Math.round((atual.totalParcelas / totalReceitas) * 100)}% da sua renda.`,
      acao: "Evite novas compras parceladas até as atuais terminarem. Parcela acumulada reduz o dinheiro livre dos meses seguintes.",
    });
  }

  // 5. Contas fixas pesadas.
  if (totalReceitas > 0 && atual.totalContasFixas / totalReceitas >= LIMITE_FIXAS_RENDA) {
    dicas.push({
      id: "fixas-altas",
      nivel: "alta",
      titulo: "As contas fixas consomem mais da metade da renda",
      explicacao: `Contas fixas somam ${formatarBRL(atual.totalContasFixas)}, ${Math.round((atual.totalContasFixas / totalReceitas) * 100)}% do que você recebe. Elas se repetem todo mês, então qualquer corte vale para o ano inteiro.`,
      acao: "Veja planos de internet, telefone, streaming e seguros que dá para renegociar, trocar ou cancelar.",
    });
  }

  // 6. Muito gasto no crédito.
  const credito = atual.gastosPorForma.credito;
  if (credito / totalDespesas >= LIMITE_CREDITO_DESPESAS) {
    dicas.push({
      id: "muito-credito",
      nivel: "media",
      titulo: "Mais da metade dos gastos está no cartão de crédito",
      explicacao: `${formatarBRL(credito)} das despesas (${Math.round((credito / totalDespesas) * 100)}%) estão no crédito, incluindo parcelas. No crédito é mais fácil perder a noção do total e, se a fatura não for paga inteira, entram juros altos.`,
      acao: "Para os gastos do dia a dia, prefira débito ou Pix: o dinheiro sai na hora e fica mais fácil ver o que sobra.",
    });
  }

  // 7. Parcelas terminando logo: boa notícia, vale planejar.
  const terminando = parcelas
    .filter((p) => p.status === "ativo")
    .map((p) => ({ p, s: situacaoParcela(p, mes, ano) }))
    .filter(({ s }) => s.estado === "andamento" && s.restantes <= 2);
  if (terminando.length > 0) {
    const liberado = terminando.reduce((acc, { p }) => acc + paraNumero(p.valor_parcela), 0);
    const ultima = terminando.reduce(
      (maisTarde, { s }) =>
        s.fim.ano * 12 + s.fim.mes > maisTarde.ano * 12 + maisTarde.mes ? s.fim : maisTarde,
      terminando[0]!.s.fim,
    );
    dicas.push({
      id: "parcelas-terminando",
      nivel: "info",
      titulo: "Parcelas terminando em breve",
      explicacao: `${terminando.length} compra(s) parcelada(s) acaba(m) em até 2 meses (até ${nomeDoMes(ultima.mes)}/${ultima.ano}). Isso libera ${formatarBRL(liberado)} por mês no orçamento.`,
      acao: "Combine consigo mesmo de guardar esse valor assim que a parcela terminar, em vez de gastar com algo novo.",
      economiaMensal: liberado,
    });
  }

  // 8. Nada preocupante.
  if (dicas.length === 0) {
    dicas.push({
      id: "tudo-certo",
      nivel: "info",
      titulo: "Seus gastos estão equilibrados neste mês",
      explicacao:
        totalReceitas > 0
          ? `Você gastou ${Math.round((totalDespesas / totalReceitas) * 100)}% da renda e nenhuma categoria ou tipo de gasto passou dos limites de atenção.`
          : "Nenhuma categoria ou tipo de gasto passou dos limites de atenção.",
      acao: "Mantenha o ritmo e, se sobrar, separe uma parte do saldo logo no começo do mês.",
    });
  }

  const ordem = { alta: 0, media: 1, info: 2 } as const;
  return dicas.sort((a, b) => ordem[a.nivel] - ordem[b.nivel]);
}
