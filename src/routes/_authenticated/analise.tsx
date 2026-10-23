import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { addMonths, format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Info,
  Lightbulb,
  PiggyBank,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useDadosFinanceiros } from "@/hooks/use-dados-financeiros";
import { formatarBRL } from "@/lib/formatadores";
import { PALETA_CATEGORIAS } from "@/lib/cores-categorias";
import type { GrupoPagamento } from "@/lib/financas";
import {
  categoriasAnalisadas,
  gerarDicas,
  maioresGastos,
  ROTULO_GRUPO_PAGAMENTO,
  type Dica,
} from "@/lib/analise";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/analise")({
  head: () => ({
    meta: [
      { title: "Análise | Controle Financeiro Pessoal" },
      {
        name: "description",
        content: "Veja para onde vai seu dinheiro e como reduzir os maiores gastos.",
      },
    ],
  }),
  component: PaginaAnalise,
});

const percentual = (v: number) => `${Math.round(v * 100)}%`;

const NIVEL_DICA: Record<Dica["nivel"], { rotulo: string; classes: string; icone: typeof Info }> = {
  alta: {
    rotulo: "Atenção",
    classes: "border-negativo/40 bg-negativo/5",
    icone: AlertTriangle,
  },
  media: {
    rotulo: "Vale revisar",
    classes: "border-[#F9A825]/50 bg-[#FFF3CD]/40",
    icone: Lightbulb,
  },
  info: {
    rotulo: "Informação",
    classes: "border-primary/30 bg-primary/5",
    icone: Info,
  },
};

function PaginaAnalise() {
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const mes = dataSelecionada.getMonth() + 1;
  const ano = dataSelecionada.getFullYear();
  const anterior = subMonths(dataSelecionada, 1);

  const { data: atual, isLoading } = useDadosFinanceiros(mes, ano);
  const { data: mesAnterior } = useDadosFinanceiros(anterior.getMonth() + 1, anterior.getFullYear());

  const { data: parcelas } = useQuery({
    queryKey: ["parcelas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcelas")
        .select(`
          *,
          categorias (
            nome,
            cor
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const categorias = useMemo(
    () => (atual ? categoriasAnalisadas(atual, mesAnterior) : []),
    [atual, mesAnterior],
  );
  const maiores = useMemo(() => (atual ? maioresGastos(atual) : []), [atual]);
  const dicas = useMemo(
    () => (atual ? gerarDicas(atual, mesAnterior, parcelas ?? [], mes, ano) : []),
    [atual, mesAnterior, parcelas, mes, ano],
  );

  const gruposPagamento = useMemo(() => {
    if (!atual) return [];
    return (Object.entries(atual.gastosPorForma) as [GrupoPagamento, number][])
      .filter(([, total]) => total > 0)
      .map(([grupo, total]) => ({
        grupo,
        rotulo: ROTULO_GRUPO_PAGAMENTO[grupo],
        total,
        parte: atual.totalDespesas > 0 ? total / atual.totalDespesas : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [atual]);

  const tiposDeGasto = useMemo(() => {
    if (!atual) return [];
    const itens = [
      {
        rotulo: "Contas fixas",
        explicacao: "Se repetem todo mês (aluguel, internet...). Difíceis de mudar rápido, mas um corte vale o ano todo.",
        total: atual.totalContasFixas,
      },
      {
        rotulo: "Parcelado no cartão",
        explicacao: "Compras que você já fez e ainda está pagando. Só diminuem quando as parcelas terminam.",
        total: atual.totalParcelas,
      },
      {
        rotulo: "Gastos do dia a dia",
        explicacao: "Lançamentos avulsos do mês. É onde você tem mais controle para economizar agora.",
        total: atual.despesasManuais,
      },
    ];
    return itens.map((i) => ({
      ...i,
      parte: atual.totalDespesas > 0 ? i.total / atual.totalDespesas : 0,
    }));
  }, [atual]);

  const economiaTotal = dicas.reduce((acc, d) => acc + (d.economiaMensal ?? 0), 0);
  const nomeMes = format(dataSelecionada, "MMMM 'de' yyyy", { locale: ptBR });
  const semDados = !!atual && atual.totalDespesas === 0;

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Análise dos seus gastos</h1>
          <p className="text-sm text-muted-foreground">
            Para onde o dinheiro está indo e onde dá para economizar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Mês anterior"
            onClick={() => setDataSelecionada((d) => subMonths(d, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-[170px] justify-center">
            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold capitalize">{nomeMes}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Próximo mês"
            onClick={() => setDataSelecionada((d) => addMonths(d, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isLoading || !atual ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : semDados ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Não há despesas em {nomeMes}. Lance seus gastos na tela <strong>Mês</strong> para ver a análise.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 1. Resumo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Resumo do mês</CardTitle>
              <CardDescription>A visão geral, em uma olhada.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Você recebeu</p>
                  <p className="text-xl font-bold text-receita">{formatarBRL(atual.totalReceitas)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Você gastou</p>
                  <p className="text-xl font-bold text-negativo">{formatarBRL(atual.totalDespesas)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Sobrou</p>
                  <p className={cn("text-xl font-bold", atual.saldo >= 0 ? "text-saldo" : "text-negativo")}>
                    {formatarBRL(atual.saldo)}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {atual.totalReceitas > 0
                  ? `Você usou ${percentual(atual.percentGasto)} da sua renda em despesas.`
                  : "Nenhuma receita lançada neste mês, então não dá para comparar com a renda."}
              </p>
            </CardContent>
          </Card>

          {/* 2. Categorias */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. Para onde vai o seu dinheiro</CardTitle>
              <CardDescription>
                Categorias da maior para a menor. A seta compara com o mês anterior.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {categorias.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma despesa com categoria neste mês.
                </p>
              ) : (
                categorias.map((c, i) => (
                  <div key={c.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}º</span>
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PALETA_CATEGORIAS[i % PALETA_CATEGORIAS.length] }}
                        />
                        <span className="font-medium truncate">{c.nome}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {c.variacao !== undefined && Math.abs(c.variacao) >= 1 && (
                          <span
                            className={cn(
                              "flex items-center text-xs",
                              c.variacao > 0 ? "text-negativo" : "text-receita",
                            )}
                            title="Diferença em relação ao mês anterior"
                          >
                            {c.variacao > 0 ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            {formatarBRL(Math.abs(c.variacao))}
                          </span>
                        )}
                        <span className="font-semibold">{formatarBRL(c.total)}</span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${Math.max(c.parteDasDespesas * 100, 2)}%`,
                          backgroundColor: PALETA_CATEGORIAS[i % PALETA_CATEGORIAS.length],
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {percentual(c.parteDasDespesas)} das despesas
                      {atual.totalReceitas > 0 && ` · ${percentual(c.parteDaRenda)} da renda`}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* 3. Maiores gastos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3. Os 5 maiores gastos</CardTitle>
              <CardDescription>Itens individuais que mais pesaram no mês.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="divide-y">
                {maiores.map((g, i) => (
                  <li key={g.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}º</span>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{g.descricao}</p>
                        <p className="text-xs text-muted-foreground">
                          {g.categoria} ·{" "}
                          {g.origem === "fixa"
                            ? "conta fixa"
                            : g.origem === "parcela"
                              ? "parcela do cartão"
                              : "gasto avulso"}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold shrink-0">{formatarBRL(g.valor)}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* 4. Tipos de gasto */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">4. Que tipo de gasto é cada um</CardTitle>
              <CardDescription>
                Separar fixo, parcelado e dia a dia mostra onde você consegue mexer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tiposDeGasto.map((t) => (
                <div key={t.rotulo} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{t.rotulo}</span>
                    <span className="font-semibold">
                      {formatarBRL(t.total)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">({percentual(t.parte)})</span>
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${t.parte * 100}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{t.explicacao}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 5. Forma de pagamento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">5. Como você está pagando</CardTitle>
              <CardDescription>
                Crédito, débito e dinheiro/Pix. Contas fixas e lançamentos antigos ficam em grupos próprios.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {gruposPagamento.map((g) => (
                <div key={g.grupo} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{g.rotulo}</span>
                    <span className="font-semibold">
                      {formatarBRL(g.total)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">({percentual(g.parte)})</span>
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-saldo" style={{ width: `${g.parte * 100}%` }} />
                  </div>
                </div>
              ))}
              {atual.gastosPorForma.credito > 0 && (
                <p className="text-xs text-muted-foreground pt-1">
                  O crédito inclui as parcelas do cartão deste mês.
                </p>
              )}
            </CardContent>
          </Card>

          {/* 6. Como diminuir */}
          <Card className="border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-primary" /> 6. Como diminuir seus gastos
              </CardTitle>
              <CardDescription>
                Sugestões automáticas baseadas nos números deste mês. Os valores de economia são
                estimativas, não garantias.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dicas.map((d) => {
                const nivel = NIVEL_DICA[d.nivel];
                const Icone = nivel.icone;
                return (
                  <div key={d.id} className={cn("rounded-lg border p-4 space-y-2", nivel.classes)}>
                    <div className="flex items-start gap-2">
                      <Icone className="h-4 w-4 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          {nivel.rotulo}
                        </p>
                        <p className="font-semibold leading-tight">{d.titulo}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">O que está acontecendo: </strong>
                      {d.explicacao}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">O que fazer: </strong>
                      {d.acao}
                    </p>
                    {d.economiaMensal !== undefined && d.economiaMensal > 0 && (
                      <p className="text-sm font-semibold text-receita">
                        Economia estimada: {formatarBRL(d.economiaMensal)} por mês
                      </p>
                    )}
                  </div>
                );
              })}
              {economiaTotal > 0 && dicas.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  As economias acima podem se sobrepor, então não some todas.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
