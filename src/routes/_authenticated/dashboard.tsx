import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  BarChart3,
  Calendar as CalendarIcon
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
import { processarResumoFinanceiro } from "@/lib/financas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

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
  const [ano, setAno] = useState(new Date().getFullYear());
  const anosDisponiveis = useMemo(() => {
    const atual = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => atual - 2 + i);
  }, []);

  const { data: dadosAnuais, isLoading } = useQuery({
    queryKey: ["dados-anuais", ano],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Buscar tudo do ano selecionado
      const [
        { data: lancamentos },
        { data: contasFixas },
        { data: parcelas },
        { data: categorias }
      ] = await Promise.all([
        supabase.from("lancamentos").select("*").eq("ano", ano),
        supabase.from("contas_fixas").select("*").eq("ativo", true),
        supabase.from("parcelas").select("*").eq("status", "ativo"),
        supabase.from("categorias").select("*")
      ]);

      // Processar cada mês
      const meses = Array.from({ length: 12 }, (_, i) => i + 1);
      const resumoPorMes = meses.map(mes => {
        const lancamentosMes = (lancamentos || []).filter(l => l.mes === mes);
        return {
          mes,
          nomeMes: MESES_PT_BR[mes - 1],
          ...processarResumoFinanceiro(
            lancamentosMes,
            contasFixas || [],
            parcelas || [],
            categorias || [],
            mes,
            ano
          )
        };
      });

      return {
        resumoPorMes,
        categorias: categorias || []
      };
    }
  });

  const stats = useMemo(() => {
    if (!dadosAnuais) return null;
    
    const totalReceitas = dadosAnuais.resumoPorMes.reduce((acc, m) => acc + m.totalReceitas, 0);
    const totalDespesas = dadosAnuais.resumoPorMes.reduce((acc, m) => acc + m.totalDespesas, 0);
    const saldo = totalReceitas - totalDespesas;
    
    // Média de gasto da renda (apenas meses com receita > 0)
    const mesesComReceita = dadosAnuais.resumoPorMes.filter(m => m.totalReceitas > 0);
    const percentMedioGasto = mesesComReceita.length > 0
      ? mesesComReceita.reduce((acc, m) => acc + m.percentGasto, 0) / mesesComReceita.length
      : 0;
    
    // Gastos por categoria (consolidado ano)
    const gastosCategoria: Record<string, { nome: string; total: number; cor: string }> = {};
    dadosAnuais.resumoPorMes.forEach(m => {
      Object.entries(m.gastosPorCategoria).forEach(([id, data]) => {
        if (!gastosCategoria[id]) {
          gastosCategoria[id] = { ...data };
        } else {
          gastosCategoria[id].total += data.total;
        }
      });
    });

    const pieData = Object.values(gastosCategoria)
      .filter(g => g.total > 0)
      .sort((a, b) => b.total - a.total);

    return {
      totalReceitas,
      totalDespesas,
      saldo,
      percentMedioGasto,
      pieData
    };
  }, [dadosAnuais]);

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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard {ano}</h1>
          <p className="text-muted-foreground">
            Visão geral consolidada das suas finanças este ano.
          </p>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-[#2E7D32]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2E7D32]">{formatarBRL(stats?.totalReceitas || 0)}</div>
            <p className="text-xs text-muted-foreground">Acumulado do ano</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesa Total</CardTitle>
            <TrendingDown className="h-4 w-4 text-[#C62828]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#C62828]">{formatarBRL(stats?.totalDespesas || 0)}</div>
            <p className="text-xs text-muted-foreground">Incluindo fixas e parcelas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-[#1F4E78]" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats?.saldo || 0) >= 0 ? 'text-[#1F4E78]' : 'text-[#C62828]'}`}>
              {formatarBRL(stats?.saldo || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Resultado líquido anual</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">% Médio Gasto</CardTitle>
            <PieChart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {(stats?.percentMedioGasto || 0) > 10 ? ">1000%" : `${((stats?.percentMedioGasto || 0) * 100).toFixed(1)}%`}
            </div>
            <p className="text-xs text-muted-foreground">Da renda média mensal</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#1F4E78]" />
              Receitas vs Despesas
            </CardTitle>
            <CardDescription>Fluxo mensal de entradas e saídas.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosAnuais?.resumoPorMes || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="nomeMes" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip 
                  formatter={(value: any) => formatarBRL(Number(value))}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend />
                <Bar name="Receitas" dataKey="totalReceitas" fill="#2E7D32" radius={[4, 4, 0, 0]} />
                <Bar name="Despesas" dataKey="totalDespesas" fill="#C62828" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#1F4E78]" />
              Evolução do Saldo
            </CardTitle>
            <CardDescription>Saldo líquido ao longo do ano.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosAnuais?.resumoPorMes || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="nomeMes" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip 
                  formatter={(value: any) => formatarBRL(Number(value))}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar 
                  name="Saldo" 
                  dataKey="saldo" 
                  radius={[4, 4, 0, 0]}
                >
                  {(dadosAnuais?.resumoPorMes || []).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.saldo >= 0 ? "#1F4E78" : "#C62828"} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-[#1F4E78]" />
            Tabela Anual Detalhada
          </CardTitle>
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
                  <th className="text-right py-3 px-2 font-medium">Pendentes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dadosAnuais?.resumoPorMes.map((m) => (
                  <tr key={m.mes} className="hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-2 font-medium">{m.nomeMes}</td>
                    <td className="py-3 px-2 text-right text-[#2E7D32]">{formatarBRL(m.totalReceitas)}</td>
                    <td className="py-3 px-2 text-right text-[#C62828]">{formatarBRL(m.totalDespesas)}</td>
                    <td className={`py-3 px-2 text-right font-medium ${m.saldo >= 0 ? 'text-[#1F4E78]' : 'text-[#C62828]'}`}>
                      {formatarBRL(m.saldo)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${m.percentGasto > 0.9 ? 'bg-[#C62828]' : 'bg-[#1F4E78]'}`} 
                            style={{ width: `${Math.min(m.percentGasto * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] w-8">{(m.percentGasto * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right text-[#2E7D32]">{formatarBRL(m.pagas)}</td>
                    <td className="py-3 px-2 text-right text-[#F9A825]">{formatarBRL(m.pendentes)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/30 font-bold border-t">
                <tr>
                  <td className="py-4 px-2">TOTAL/MÉDIA</td>
                  <td className="py-4 px-2 text-right text-[#2E7D32]">{formatarBRL(stats?.totalReceitas || 0)}</td>
                  <td className="py-4 px-2 text-right text-[#C62828]">{formatarBRL(stats?.totalDespesas || 0)}</td>
                  <td className={`py-4 px-2 text-right ${(stats?.saldo || 0) >= 0 ? 'text-[#1F4E78]' : 'text-[#C62828]'}`}>
                    {formatarBRL(stats?.saldo || 0)}
                  </td>
                  <td className="py-4 px-2 text-center text-primary">
                    {((stats?.percentMedioGasto || 0) * 100).toFixed(1)}%
                  </td>
                  <td className="py-4 px-2 text-right text-[#2E7D32]">
                    {formatarBRL(dadosAnuais?.resumoPorMes.reduce((acc, m) => acc + m.pagas, 0) || 0)}
                  </td>
                  <td className="py-4 px-2 text-right text-[#F9A825]">
                    {formatarBRL(dadosAnuais?.resumoPorMes.reduce((acc, m) => acc + m.pendentes, 0) || 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
