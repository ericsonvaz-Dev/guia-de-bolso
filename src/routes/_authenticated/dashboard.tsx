import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  BarChart3,
  Calendar as CalendarIcon,
  AlertTriangle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Cell,
  Pie,
  PieChart as RechartsPieChart
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { formatarBRL, MESES_PT_BR } from "@/lib/formatadores";
import { toast } from "sonner";
import { processarResumoFinanceiro } from "@/lib/financas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const PALETA_CATEGORIAS = [
  "#1F4E78", "#C62828", "#2E7D32", "#F9A825", "#6A1B9A",
  "#00838F", "#EF6C00", "#AD1457", "#558B2F", "#4527A0",
  "#00695C", "#D84315", "#5D4037", "#283593", "#9E9D24"
];

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Controle Financeiro Pessoal" },
      {
        name: "description",
        content: "Visão geral do seu ano financeiro: receitas, despesas e saldo.",
      },
    ],
  }),
  component: PaginaDashboard,
});

function PaginaDashboard() {
  const queryClient = useQueryClient();
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  
  const fixCategoriesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("fix_user_categories");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dados-financeiros", ano, mes] });
      toast.success("Categorias padrão restauradas!");
    },
    onError: (error: any) => {
      toast.error("Erro ao processar categorias. Tente novamente.");
    },
  });
  const anosDisponiveis = useMemo(() => {
    const atual = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => atual - 2 + i);
  }, []);

  const { data: financeiro, isLoading } = useQuery({
    queryKey: ["dados-financeiros", ano, mes],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const [
        { data: lancamentos },
        { data: contasFixas },
        { data: parcelas },
        { data: categorias }
      ] = await Promise.all([
        supabase.from("lancamentos").select("*").eq("ano", ano).eq("mes", mes),
        supabase.from("contas_fixas").select("*").eq("ativo", true),
        supabase.from("parcelas").select("*").eq("status", "ativo"),
        supabase.from("categorias").select("*")
      ]);

      const resumo = processarResumoFinanceiro(
        lancamentos || [],
        contasFixas || [],
        parcelas || [],
        categorias || [],
        mes,
        ano
      );

      return {
        resumo,
        categorias: categorias || []
      };
    }
  });

  const stats = useMemo(() => {
    if (!financeiro) return null;
    
    const { totalReceitas, totalDespesas, saldo, percentGasto, gastosPorCategoria } = financeiro.resumo;
    
    const pieData = Object.values(gastosPorCategoria)
      .filter(g => g.total > 0)
      .sort((a, b) => b.total - a.total)
      .map((item, index) => ({
        ...item,
        corGrafico: PALETA_CATEGORIAS[index % PALETA_CATEGORIAS.length]
      }));

    return {
      totalReceitas,
      totalDespesas,
      saldo,
      percentGasto,
      pieData
    };
  }, [financeiro]);


  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {financeiro && financeiro.categorias.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Nenhuma categoria encontrada</p>
              <p className="text-xs text-amber-700">O sistema precisa de categorias para funcionar corretamente. Clique ao lado para restaurar os padrões.</p>
            </div>
          </div>
          <Button 
            size="sm" 
            className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
            onClick={() => fixCategoriesMutation.mutate()}
            disabled={fixCategoriesMutation.isPending}
          >
            {fixCategoriesMutation.isPending ? "Criando..." : "Criar Categorias Padrão"}
          </Button>
        </div>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard {ano}</h1>
          <p className="text-muted-foreground">
            Visão geral consolidada do mês selecionado.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="seletor-mes" className="text-sm font-medium">Mês:</label>
            <select 
              id="seletor-mes"
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="h-9 w-32 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {MESES_PT_BR.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="seletor-ano" className="text-sm font-medium">Ano:</label>
            <select 
              id="seletor-ano"
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              className="h-9 w-28 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {anosDisponiveis.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita no Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-[#2E7D32]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2E7D32]">{formatarBRL(stats?.totalReceitas || 0)}</div>
            <p className="text-xs text-muted-foreground">Total de entradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesa no Mês</CardTitle>
            <TrendingDown className="h-4 w-4 text-[#C62828]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#C62828]">{formatarBRL(stats?.totalDespesas || 0)}</div>
            <p className="text-xs text-muted-foreground">Incluindo fixas e parcelas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo no Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-[#1F4E78]" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats?.saldo || 0) >= 0 ? 'text-[#1F4E78]' : 'text-[#C62828]'}`}>
              {formatarBRL(stats?.saldo || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Resultado líquido mensal</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">% Gasto</CardTitle>
            <PieChart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {(stats?.percentGasto || 0) > 10 ? ">1000%" : `${((stats?.percentGasto || 0) * 100).toFixed(1)}%`}
            </div>
            <p className="text-xs text-muted-foreground">Da renda do mês</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-[#1F4E78]" />
              Distribuição de Gastos
            </CardTitle>
            <CardDescription>Onde seu dinheiro foi no mês.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {stats?.pieData && stats.pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={stats.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="total"
                    nameKey="nome"
                  >
                    {stats.pieData.map((entry: any, index) => (
                      <Cell key={`cell-${index}`} fill={entry.corGrafico} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => formatarBRL(Number(value))}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend 
                    formatter={(value, entry: any) => (
                      <span style={{ color: entry.color }}>{value}</span>
                    )}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Sem despesas registradas neste mês.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#1F4E78]" />
              Resumo por Status
            </CardTitle>
            <CardDescription>Pagamentos efetuados vs pendentes.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Pagas', valor: financeiro?.resumo.pagas || 0, fill: '#2E7D32' },
                { name: 'Pendentes', valor: financeiro?.resumo.pendentes || 0, fill: '#F9A825' }
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `R$ ${v}`} />
                <Tooltip formatter={(value: any) => formatarBRL(Number(value))} />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-[#1F4E78]" />
            Lançamentos do Mês
          </CardTitle>
          <CardDescription>Lista detalhada de movimentações para {MESES_PT_BR[mes - 1]}.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-3 px-2 font-medium">Mês</th>
                  <th className="text-right py-3 px-2 font-medium text-[#2E7D32]">Receitas</th>
                  <th className="text-right py-3 px-2 font-medium text-[#C62828]">Despesas</th>
                  <th className="text-right py-3 px-2 font-medium">Saldo</th>
                  <th className="text-center py-3 px-2 font-medium">% Gasto</th>
                  <th className="text-right py-3 px-2 font-medium">Pagas</th>
                  <th className="text-right py-3 px-2 font-medium">Pendentes no Mês</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {financeiro && (
                  <tr className="hover:bg-muted/50 transition-colors font-medium">
                    <td className="py-3 px-2">{MESES_PT_BR[mes - 1]}</td>
                    <td className="py-3 px-2 text-right text-[#2E7D32]">{formatarBRL(financeiro.resumo.totalReceitas)}</td>
                    <td className="py-3 px-2 text-right text-[#C62828]">{formatarBRL(financeiro.resumo.totalDespesas)}</td>
                    <td className={`py-3 px-2 text-right ${financeiro.resumo.saldo >= 0 ? 'text-[#1F4E78]' : 'text-[#C62828]'}`}>
                      {formatarBRL(financeiro.resumo.saldo)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${financeiro.resumo.percentGasto > 0.9 ? 'bg-[#C62828]' : 'bg-[#1F4E78]'}`} 
                            style={{ width: `${Math.min(financeiro.resumo.percentGasto * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] w-8">{(financeiro.resumo.percentGasto * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right text-[#2E7D32]">{formatarBRL(financeiro.resumo.pagas)}</td>
                    <td className="py-3 px-2 text-right text-[#F9A825]">{formatarBRL(financeiro.resumo.pendentes)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
