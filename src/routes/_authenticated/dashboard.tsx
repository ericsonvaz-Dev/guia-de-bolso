import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  BarChart3,
  Calendar as CalendarIcon,
  AlertTriangle,
  RefreshCcw,
  Pencil,
  Settings,
  User,
  Lock,
  Mail
} from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useDadosFinanceiros } from "@/hooks/use-dados-financeiros";
import { PALETA_CATEGORIAS } from "@/lib/cores-categorias";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Controle Financeiro Pessoal" },
      {
        name: "description",
        content: "Visão geral do seu desempenho financeiro mensal.",
      },
    ],
  }),
  component: PaginaDashboard,
});

function PaginaDashboard() {
  const queryClient = useQueryClient();
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  
  const [configAberto, setConfigAberto] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  
  const { data: userAuth } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    }
  });

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["profile", userAuth?.id],
    enabled: !!userAuth?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles" as any)
        .select("*")
        .eq("id", userAuth!.id)
        .single();
      if (error) throw error;
      return data;
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await supabase
        .from("profiles" as any)
        .update({ nome_exibicao: nome, updated_at: new Date().toISOString() })
        .eq("id", userAuth!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userAuth?.id] });
      toast.success("Perfil atualizado com sucesso!");
    },
    onError: () => toast.error("Erro ao atualizar nome.")
  });

  const updateAuthMutation = useMutation({
    mutationFn: async ({ email, password }: { email?: string; password?: string }) => {
      const attributes: any = {};
      if (email) attributes.email = email;
      if (password) attributes.password = password;
      const { error } = await supabase.auth.updateUser(attributes);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dados de acesso atualizados. Verifique seu e-mail se alterou o endereço.");
      setNovaSenha("");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao atualizar dados de acesso.")
  });

  const { data: resumo, isLoading, isError, error, refetch } = useDadosFinanceiros(mes, ano);

  // Buscar categorias separadamente para o alerta de reparo
  const { data: categorias } = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias").select("*");
      if (error) throw error;
      return data || [];
    }
  });

  const fixCategoriesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("fix_user_categories");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dados-financeiros", ano, mes] });
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
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

  const stats = useMemo(() => {
    if (!resumo) return {
      totalReceitas: 0,
      totalDespesas: 0,
      saldo: 0,
      percentGasto: 0,
      pieData: [],
      pagas: 0,
      pendentes: 0
    };
    
    const { totalReceitas, totalDespesas, saldo, percentGasto, gastosPorCategoria, pagas, pendentes } = resumo;
    
    const pieData = Object.values(gastosPorCategoria || {})
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
      pieData,
      pagas,
      pendentes
    };
  }, [resumo]);

  const percentGastoDisplay = useMemo(() => {
    const { totalReceitas, percentGasto } = stats;
    if (totalReceitas === 0) return "—";
    const percent = percentGasto * 100;
    if (percent > 100) return "100%+";
    return `${percent.toFixed(1)}%`;
  }, [stats]);

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

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Erro ao carregar dados
            </CardTitle>
            <CardDescription>
              Não foi possível carregar as informações financeiras.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Ocorreu um erro inesperado no servidor."}
            </p>
            <Button onClick={() => refetch()} className="w-full gap-2">
              <RefreshCcw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {categorias && categorias.length === 0 && (
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
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {(profile as any)?.nome_exibicao ? `Olá, ${(profile as any).nome_exibicao}` : `Dashboard ${ano}`}
            </h1>
            <Dialog open={configAberto} onOpenChange={(open) => {
              setConfigAberto(open);
              if (open) {
                setNovoNome((profile as any)?.nome_exibicao || "");
                setNovoEmail(userAuth?.email || "");
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Configurações de Perfil</DialogTitle>
                  <DialogDescription>
                    Atualize seu nome de exibição e credenciais de acesso.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="nome" className="flex items-center gap-2">
                      <User className="h-4 w-4" /> Nome de Exibição
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="nome"
                        value={novoNome}
                        onChange={(e) => setNovoNome(e.target.value)}
                        placeholder="Seu nome"
                      />
                      <Button 
                        size="sm"
                        onClick={() => updateProfileMutation.mutate(novoNome)}
                        disabled={updateProfileMutation.isPending}
                      >
                        Salvar
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4 mt-2">
                    <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <Lock className="h-4 w-4" /> Segurança e Acesso
                    </h4>
                    
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="email" className="flex items-center gap-2">
                          <Mail className="h-3 w-3" /> E-mail
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={novoEmail}
                          onChange={(e) => setNovoEmail(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="senha">Nova Senha</Label>
                        <Input
                          id="senha"
                          type="password"
                          value={novaSenha}
                          onChange={(e) => setNovaSenha(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setConfigAberto(false)}
                  >
                    Fechar
                  </Button>
                  <Button 
                    onClick={() => {
                      const updates: any = {};
                      if (novoEmail !== userAuth?.email) updates.email = novoEmail;
                      if (novaSenha) updates.password = novaSenha;
                      if (Object.keys(updates).length > 0) {
                        updateAuthMutation.mutate(updates);
                      }
                    }}
                    disabled={updateAuthMutation.isPending}
                  >
                    {updateAuthMutation.isPending ? "Salvando..." : "Atualizar Acesso"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {(profile as any)?.nome_exibicao && <span className="text-3xl font-bold tracking-tight text-muted-foreground ml-2">{ano}</span>}
          </div>
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
            <div className="text-2xl font-bold text-[#2E7D32]">{formatarBRL(stats.totalReceitas)}</div>
            <p className="text-xs text-muted-foreground">Total de entradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesa no Mês</CardTitle>
            <TrendingDown className="h-4 w-4 text-[#C62828]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#C62828]">{formatarBRL(stats.totalDespesas)}</div>
            <p className="text-xs text-muted-foreground">Incluindo fixas e parcelas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo no Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-[#1F4E78]" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.saldo >= 0 ? 'text-[#1F4E78]' : 'text-[#C62828]'}`}>
              {formatarBRL(stats.saldo)}
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
              {percentGastoDisplay}
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
            {stats.pieData && stats.pieData.length > 0 ? (
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
                    {stats.pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.corGrafico || "#888888"} />
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
                { name: 'Pagas', valor: stats.pagas, fill: '#2E7D32' },
                { name: 'Pendentes', valor: stats.pendentes, fill: '#F9A825' }
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
                {resumo && (
                  <tr className="hover:bg-muted/50 transition-colors font-medium">
                    <td className="py-3 px-2">{MESES_PT_BR[mes - 1]}</td>
                    <td className="py-3 px-2 text-right text-[#2E7D32]">{formatarBRL(stats.totalReceitas)}</td>
                    <td className="py-3 px-2 text-right text-[#C62828]">{formatarBRL(stats.totalDespesas)}</td>
                    <td className={`py-3 px-2 text-right ${stats.saldo >= 0 ? 'text-[#1F4E78]' : 'text-[#C62828]'}`}>
                      {formatarBRL(stats.saldo)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${resumo.percentGasto > 0.9 ? 'bg-[#C62828]' : 'bg-[#1F4E78]'}`} 
                            style={{ width: `${Math.min(resumo.percentGasto * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] w-8">{(resumo.percentGasto * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right text-[#2E7D32]">{formatarBRL(stats.pagas)}</td>
                    <td className="py-3 px-2 text-right text-[#F9A825]">{formatarBRL(stats.pendentes)}</td>
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