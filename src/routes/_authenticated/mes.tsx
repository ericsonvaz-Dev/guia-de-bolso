import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2
} from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, setMonth, setYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from "recharts";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { useDadosFinanceiros } from "@/hooks/use-dados-financeiros";
import { formatarBRL, formatarData, MESES_PT_BR, paraNumero } from "@/lib/formatadores";
import { PALETA_CATEGORIAS } from "@/lib/cores-categorias.ts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/mes")({
  head: () => ({
    meta: [
      { title: "Mês | Controle Financeiro Pessoal" },
      {
        name: "description",
        content: "Gestão mensal de receitas e despesas.",
      },
    ],
  }),
  component: PaginaMes,
});

const formSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  categoria_id: z.string().min(1, "Categoria é obrigatória"),
  valor: z.number().min(0.01, "Valor deve ser maior que zero"),
  data: z.string().min(1, "Data é obrigatória"),
  tipo: z.enum(["receita", "despesa"]),
  status: z.enum(["pago", "pendente"]),
});

type FormValues = z.infer<typeof formSchema>;

function PaginaMes() {
  const queryClient = useQueryClient();
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [tipoNovoLancamento, setTipoNovoLancamento] = useState<"receita" | "despesa" | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [itemParaExcluir, setItemParaExcluir] = useState<string | null>(null);
  
  const mes = dataSelecionada.getMonth() + 1;
  const ano = dataSelecionada.getFullYear();

  const { data: categorias } = useQuery({
    queryKey: ["categorias", tipoNovoLancamento],
    queryFn: async () => {
      if (!tipoNovoLancamento) return [];
      const { data, error } = await supabase
        .from("categorias")
        .select("*")
        .eq("tipo", tipoNovoLancamento);
      if (error) throw error;
      return data;
    },
    enabled: !!tipoNovoLancamento,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      descricao: "",
      categoria_id: "",
      valor: 0,
      data: format(new Date(ano, mes - 1, Math.min(new Date().getDate(), 28)), "yyyy-MM-dd"),
      tipo: "receita",
      status: "pendente",
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const dataLancamento = new Date(values.data + 'T12:00:00');
      
      const { error } = await supabase.from("lancamentos").insert({
        user_id: user.id,
        descricao: values.descricao,
        categoria_id: values.categoria_id,
        valor: values.valor,
        data: values.data,
        tipo: values.tipo,
        status: values.status,
        mes: dataLancamento.getMonth() + 1,
        ano: dataLancamento.getFullYear(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dados-financeiros", ano, mes] });
      toast.success("Lançamento criado com sucesso!");
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast.error("Erro ao criar lançamento: " + error.message);
    },
  });

  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lancamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dados-financeiros", ano, mes] });
      toast.success("Lançamento excluído com sucesso!");
      setItemParaExcluir(null);
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir lançamento: " + error.message);
    },
  });

  const openNovoLancamento = (tipo: "receita" | "despesa") => {
    setTipoNovoLancamento(tipo);
    form.reset({
      descricao: "",
      categoria_id: "",
      valor: 0,
      data: format(new Date(ano, mes - 1, Math.min(new Date().getDate(), 28)), "yyyy-MM-dd"),
      tipo: tipo,
      status: tipo === "receita" ? "pago" : "pendente",
    });
    setIsDialogOpen(true);
  };

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
  
  const { data: resumo, isLoading } = useDadosFinanceiros(mes, ano);

  const navegarMes = (direcao: "anterior" | "proximo") => {
    setDataSelecionada(prev => 
      direcao === "proximo" ? addMonths(prev, 1) : subMonths(prev, 1)
    );
  };

  const alternarStatus = async (id: string, statusAtual: string, origin?: string, item?: any) => {
    if ((origin === "fixa" || origin === "parcela") && item) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isVirtual = item.virtual;
      const origemId = origin === "fixa" ? item.id.replace('fixa-', '') : item.id.replace('parcela-', '');
      
      // Se já houver um registro de pagamento (item.pagamentosOcorrencia), deletamos ou invertemos
      if (item.pagamentosOcorrencia) {
        const { error } = await supabase
          .from("pagamentos_ocorrencia")
          .delete()
          .eq("id", item.pagamentosOcorrencia.id);

        if (error) {
          toast.error("Erro ao atualizar status");
        } else {
          queryClient.invalidateQueries({ queryKey: ["dados-financeiros", ano, mes] });
          toast.success("Status atualizado!");
        }
      } else {
        const { error } = await supabase
          .from("pagamentos_ocorrencia")
          .insert({
            user_id: user.id,
            origem: origin,
            origem_id: origemId,
            mes,
            ano,
            pago: true
          });

        if (error) {
          toast.error("Erro ao registrar pagamento");
        } else {
          queryClient.invalidateQueries({ queryKey: ["dados-financeiros", ano, mes] });
          toast.success("Marcado como pago!");
        }
      }
      return;
    }

    const novoStatus = statusAtual === "pago" ? "pendente" : "pago";
    const { error } = await supabase
      .from("lancamentos")
      .update({ status: novoStatus })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      queryClient.invalidateQueries({ queryKey: ["dados-financeiros", ano, mes] });
      toast.success(`Status alterado para ${novoStatus}`);
    }
  };

  const receitas = useMemo(() => 
    resumo?.lancamentosCompletos?.filter(l => l.tipo === "receita") || [], 
    [resumo]
  );
  
  const despesas = useMemo(() => 
    (resumo?.lancamentosCompletos?.filter(l => l.tipo === "despesa") || [])
      .sort((a, b) => {
        // Ordenar por data, mas colocar parcelas no fim ou manter ordem estável
        const dataA = new Date(a.data).getTime();
        const dataB = new Date(b.data).getTime();
        if (dataA !== dataB) return dataA - dataB;
        // Se mesma data, priorizar parcelas por último
        if (a.origin === "parcela" && b.origin !== "parcela") return 1;
        if (a.origin !== "parcela" && b.origin === "parcela") return -1;
        return 0;
      }), 
    [resumo]
  );

  const dadosGrafico = useMemo(() => {
    if (!resumo?.gastosPorCategoria) return [];
    return Object.values(resumo.gastosPorCategoria)
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .map((c, index) => ({
        name: c.nome,
        value: c.total,
        color: PALETA_CATEGORIAS[index % PALETA_CATEGORIAS.length]
      }));
  }, [resumo]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      {resumo && Object.keys(resumo.gastosPorCategoria).length === 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Nenhuma categoria encontrada</p>
              <p className="text-xs text-amber-700">Para lançar movimentações, você precisa de categorias. Clique ao lado para restaurar as categorias padrão.</p>
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
      {/* Cabeçalho de Navegação */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-xl font-bold capitalize">
            {format(dataSelecionada, "MMMM 'de' yyyy", { locale: ptBR })}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
            <Button variant="outline" size="icon" onClick={() => navegarMes("anterior")}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <Select 
              value={mes.toString()} 
              onValueChange={(v) => setDataSelecionada(setMonth(dataSelecionada, parseInt(v) - 1))}
            >
              <SelectTrigger className="w-full md:w-[130px]">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {MESES_PT_BR.map((m, i) => (
                  <SelectItem key={m} value={(i + 1).toString()}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={ano.toString()} 
              onValueChange={(v) => setDataSelecionada(setYear(dataSelecionada, parseInt(v)))}
            >
              <SelectTrigger className="w-full md:w-[100px]">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027, 2028].map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={() => navegarMes("proximo")}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Lançamentos */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Seção Receitas */}
          <Card className="border-l-4 border-l-receita shadow-md overflow-hidden">
            <CardHeader className="bg-receita/5 flex flex-row items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-receita" />
                <CardTitle className="text-receita uppercase tracking-wider text-sm font-bold">Receitas</CardTitle>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8 gap-1 text-receita border-receita/20 hover:bg-receita/10"
                onClick={() => openNovoLancamento("receita")}
              >
                <Plus className="w-4 h-4" /> Nova Receita
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="w-[120px]">Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-[80px] text-center">Status</TableHead>
                    <TableHead className="w-[60px] text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receitas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhuma receita lançada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    receitas.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-xs">{formatarData(r.data)}</TableCell>
                        <TableCell>{r.descricao}</TableCell>
                        <TableCell>
                          {resumo?.gastosPorCategoria[r.categoria_id || '']?.nome || "Sem Categoria"}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-receita">
                          {formatarBRL(r.valor)}
                        </TableCell>
                        <TableCell className="text-center">
                          <button onClick={() => alternarStatus(r.id, r.status)}>
                            <StatusBadge status={r.status} className="cursor-pointer hover:opacity-80 transition-opacity" />
                          </button>
                        </TableCell>
                        <TableCell className="text-center">
                          {!r.virtual ? (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setItemParaExcluir(r.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 opacity-20 cursor-not-allowed"
                              disabled
                              title="Itens fixos/parcelas são gerenciados em suas respectivas abas"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Seção Despesas */}
          <Card className="border-l-4 border-l-negativo shadow-md overflow-hidden">
            <CardHeader className="bg-negativo/5 flex flex-row items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-negativo" />
                <CardTitle className="text-negativo uppercase tracking-wider text-sm font-bold">Despesas</CardTitle>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8 gap-1 text-negativo border-negativo/20 hover:bg-negativo/10"
                onClick={() => openNovoLancamento("despesa")}
              >
                <Plus className="w-4 h-4" /> Nova Despesa
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="w-[120px]">Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-[80px] text-center">Status</TableHead>
                    <TableHead className="w-[60px] text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Despesas Manuais e Fixas */}
                  {despesas.map((d) => (
                    <TableRow key={d.id} className={cn(d.virtual && "bg-saldo/5 hover:bg-saldo/10")}>
                      <TableCell className="font-medium text-xs">
                        {formatarData(d.data)}
                      </TableCell>
                      <TableCell className="flex items-center gap-2">
                        {d.descricao}
                        {d.virtual && (
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full text-white font-bold uppercase",
                            d.origin === "fixa" ? "bg-saldo" : "bg-parcelas"
                          )}>
                            {d.origin === "fixa" ? "Fixa" : "Parcela"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {resumo?.gastosPorCategoria[d.categoria_id || '']?.nome || "Sem Categoria"}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-negativo">
                        {formatarBRL(d.valor)}
                      </TableCell>
                      <TableCell className="text-center">
                        <button 
                          onClick={() => alternarStatus(d.id, d.status, d.origin, d)}
                          className={cn("cursor-pointer")}
                        >
                          <StatusBadge status={d.status} className="cursor-pointer hover:opacity-80 transition-opacity" />
                        </button>
                      </TableCell>
                      <TableCell className="text-center">
                        {!d.virtual ? (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setItemParaExcluir(d.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 opacity-20 cursor-not-allowed"
                            disabled
                            title="Itens fixos/parcelas são gerenciados em suas respectivas abas"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {despesas.length === 0 && resumo?.totalParcelas === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhuma despesa para este mês.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Lateral - Resumo e Gráfico */}
        <div className="space-y-6">
          <Card className="shadow-lg border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Resumo do Mês</CardTitle>
              <CardDescription>Consolidado financeiro</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Receitas</span>
                  <span className="text-receita font-bold">{formatarBRL(resumo?.totalReceitas)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Despesas Manuais</span>
                  <span className="text-negativo">{formatarBRL(resumo?.despesasManuais)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Contas Fixas</span>
                  <span className="text-saldo">{formatarBRL(resumo?.totalContasFixas)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Parcelas</span>
                  <span className="text-parcela">{formatarBRL(resumo?.totalParcelas)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-bold pt-1">
                  <span>Total Despesas</span>
                  <span className="text-negativo">{formatarBRL(resumo?.totalDespesas)}</span>
                </div>
                <div className={cn(
                  "flex justify-between items-center p-3 rounded-lg mt-4 border",
                  (resumo?.saldo || 0) >= 0 ? "bg-saldo/5 border-saldo/20" : "bg-negativo/5 border-negativo/20"
                )}>
                  <span className="font-bold">Saldo</span>
                  <span className={cn(
                    "text-xl font-black",
                    (resumo?.saldo || 0) >= 0 ? "text-saldo" : "text-negativo"
                  )}>
                    {formatarBRL(resumo?.saldo)}
                  </span>
                </div>
              </div>

              <div className="pt-4 space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>% Gasto da Renda</span>
                    <span>{Math.round((resumo?.percentGasto || 0) * 100)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={cn(
                        "h-2 rounded-full transition-all duration-500",
                        (resumo?.percentGasto || 0) > 0.9 ? "bg-negativo" : "bg-primary"
                      )}
                      style={{ width: `${Math.min((resumo?.percentGasto || 0) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="bg-pago-bg p-2 rounded-md border border-pago/20 flex flex-col items-center">
                    <CheckCircle2 className="w-4 h-4 text-pago mb-1" />
                    <span className="text-[10px] text-pago font-bold uppercase">Pagas</span>
                    <span className="text-sm font-bold text-pago">{formatarBRL(resumo?.pagas)}</span>
                  </div>
                  <div className="bg-pendente-bg p-2 rounded-md border border-pendente/20 flex flex-col items-center">
                    <Clock className="w-4 h-4 text-pendente mb-1" />
                    <span className="text-[10px] text-pendente font-bold uppercase">Pendentes</span>
                    <span className="text-sm font-bold text-pendente">{formatarBRL(resumo?.pendentes)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Categorias */}
          <Card className="shadow-lg h-[400px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold">Gastos por Categoria</CardTitle>
            </CardHeader>
            <CardContent className="h-full">
              {dadosGrafico.length > 0 ? (
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dadosGrafico}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {dadosGrafico.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || "#888888"} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: any) => formatarBRL(value)}
                      />
                      <Legend 
                        layout="horizontal" 
                        verticalAlign="bottom" 
                        align="center"
                        wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
                  Sem dados para gerar o gráfico.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {tipoNovoLancamento === "receita" ? "Nova Receita" : "Nova Despesa"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do lançamento abaixo.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => upsertMutation.mutate(v))} className="space-y-4">
              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Salário, Aluguel..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="valor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor (R$)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0,00" 
                          value={field.value}
                          onChange={(e) => field.onChange(paraNumero(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="data"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="categoria_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categorias?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.cor }} />
                              {cat.nome}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pago">Pago / Recebido</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={upsertMutation.isPending}
                  className={tipoNovoLancamento === "receita" ? "bg-receita hover:bg-receita/90" : "bg-negativo hover:bg-negativo/90"}
                >
                  {upsertMutation.isPending ? "Salvando..." : "Salvar Lançamento"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Alerta de Confirmação de Exclusão */}
      <AlertDialog open={!!itemParaExcluir} onOpenChange={(open) => !open && setItemParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => itemParaExcluir && excluirMutation.mutate(itemParaExcluir)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
