import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Pencil, 
  Info,
  CheckCircle2,
  Calendar,
  AlertCircle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatarBRL, formatarData, MESES_PT_BR, nomeDoMes, paraNumero } from "@/lib/formatadores";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Tables } from "@/integrations/supabase/types";

type Parcela = Tables<"parcelas">;
type Categoria = Tables<"categorias">;

const formSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  categoria_id: z.string().min(1, "Categoria é obrigatória"),
  valor_parcela: z.number().min(0.01, "Valor deve ser maior que zero"),
  num_parcelas: z.number().min(1, "Mínimo 1 parcela"),
  mes_inicio: z.number().min(1).max(12),
  ano_inicio: z.number().min(2000).max(2100),
  data_primeira_parcela: z.string().min(1, "Data é obrigatória"),
  status: z.enum(["ativo", "quitado"]),
});

type FormValues = z.infer<typeof formSchema>;

export const Route = createFileRoute("/_authenticated/parcelas")({
  head: () => ({
    meta: [
      { title: "Parcelas | Controle Financeiro Pessoal" },
      {
        name: "description",
        content: "Acompanhe compras parceladas: valor da parcela, quantidade e status.",
      },
    ],
  }),
  component: PaginaParcelas,
});

function PaginaParcelas() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingParcela, setEditingParcela] = useState<Parcela | null>(null);

  const { data: parcelas, isLoading: isLoadingParcelas } = useQuery({
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

  const { data: categorias } = useQuery({
    queryKey: ["categorias-despesas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias")
        .select("*")
        .eq("tipo", "despesa");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      descricao: "",
      categoria_id: "",
      valor_parcela: 0,
      num_parcelas: 1,
      mes_inicio: new Date().getMonth() + 1,
      ano_inicio: new Date().getFullYear(),
      data_primeira_parcela: new Date().toISOString().split("T")[0],
      status: "ativo",
    },
  });

  // Preview das parcelas
  const watchValues = form.watch();
  const previewParcelas = useMemo(() => {
    if (!watchValues.num_parcelas || !watchValues.mes_inicio || !watchValues.ano_inicio) return [];
    
    const items = [];
    const totalMeses = watchValues.num_parcelas;
    const mesInicio = Number(watchValues.mes_inicio);
    const anoInicio = Number(watchValues.ano_inicio);

    for (let i = 0; i < totalMeses; i++) {
      const totalMesesDesdeInicio = (anoInicio * 12 + (mesInicio - 1)) + i;
      const anoItem = Math.floor(totalMesesDesdeInicio / 12);
      const mesItem = (totalMesesDesdeInicio % 12) + 1;
      items.push({ mes: mesItem, ano: anoItem });
    }
    return items;
  }, [watchValues.num_parcelas, watchValues.mes_inicio, watchValues.ano_inicio]);

  const upsertMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const payload = {
        ...values,
        user_id: user.id,
      };

      if (editingParcela) {
        const { error } = await supabase
          .from("parcelas")
          .update(payload)
          .eq("id", editingParcela.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("parcelas")
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcelas"] });
      queryClient.invalidateQueries({ queryKey: ["dados-financeiros"] });
      toast.success(editingParcela ? "Parcela atualizada!" : "Parcela criada!");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error("Erro ao salvar parcela: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("parcelas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcelas"] });
      queryClient.invalidateQueries({ queryKey: ["dados-financeiros"] });
      toast.success("Parcela excluída!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir: " + error.message);
    },
  });

  const handleEdit = (parcela: any) => {
    setEditingParcela(parcela);
    form.reset({
      descricao: parcela.descricao,
      categoria_id: parcela.categoria_id,
      valor_parcela: parcela.valor_parcela.toString(),
      num_parcelas: parcela.num_parcelas,
      mes_inicio: parcela.mes_inicio,
      ano_inicio: parcela.ano_inicio,
      data_primeira_parcela: parcela.data_primeira_parcela,
      status: parcela.status,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingParcela(null);
    form.reset();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parcelas</h1>
          <p className="text-muted-foreground">
            Gerencie compras parceladas que incidem automaticamente nos meses.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingParcela(null)} className="bg-[#6A1B9A] hover:bg-[#6A1B9A]/90 text-white">
              <Plus className="mr-2 h-4 w-4" /> Nova Parcela
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingParcela ? "Editar Parcela" : "Nova Parcela"}</DialogTitle>
              <DialogDescription>
                Configure os detalhes da compra parcelada e veja a projeção nos meses.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => upsertMutation.mutate(v))} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: iPhone 15, Notebook..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="categoria_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    name="valor_parcela"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor da Parcela (R$)</FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            placeholder="0,00" 
                            value={field.value}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^\d,.-]/g, "").replace(",", ".");
                              field.onChange(paraNumero(val));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="num_parcelas"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nº de Parcelas</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            value={field.value}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mes_inicio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mês de Início</FormLabel>
                        <Select 
                          onValueChange={(v) => field.onChange(Number(v))} 
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {MESES_PT_BR.map((mes, idx) => (
                              <SelectItem key={mes} value={(idx + 1).toString()}>
                                {mes}
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
                    name="ano_inicio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ano de Início</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            value={field.value}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="data_primeira_parcela"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data da 1ª Parcela</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="quitado">Quitado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {previewParcelas.length > 0 && (
                  <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-[#6A1B9A]">
                      <Info className="h-4 w-4" /> Projeção de Incidência
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {previewParcelas.map((p, i) => (
                        <div key={i} className="text-xs p-2 bg-white border rounded shadow-sm text-center">
                          <span className="font-medium">{nomeDoMes(p.mes)}</span>
                          <span className="text-muted-foreground ml-1">/{p.ano}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 italic">
                      Total: {formatarBRL(paraNumero(watchValues.valor_parcela) * (Number(watchValues.num_parcelas) || 0))}
                    </p>
                  </div>
                )}

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-[#6A1B9A] hover:bg-[#6A1B9A]/90 text-white" disabled={upsertMutation.isPending}>
                    {editingParcela ? "Salvar Alterações" : "Criar Parcela"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Todas as Parcelas</CardTitle>
            <CardDescription>Visualização detalhada das compras parceladas.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingParcelas ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Parcela</TableHead>
                      <TableHead>Nº</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parcelas?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Nenhuma parcela cadastrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      parcelas?.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.descricao}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="flex w-fit items-center gap-1 font-normal">
                              <div 
                                className="h-2 w-2 rounded-full" 
                                style={{ backgroundColor: p.categorias?.cor }} 
                              />
                              {p.categorias?.nome}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-red-700 font-medium">
                            {formatarBRL(p.valor_parcela)}
                          </TableCell>
                          <TableCell>{p.num_parcelas}x</TableCell>
                          <TableCell>
                            <span className="text-xs uppercase font-semibold">
                              {nomeDoMes(p.mes_inicio).substring(0, 3)}/{p.ano_inicio}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatarBRL(p.valor_parcela * p.num_parcelas)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={cn(
                                "font-medium",
                                p.status === "ativo" 
                                  ? "bg-purple-100 text-[#6A1B9A] hover:bg-purple-100" 
                                  : "bg-green-100 text-green-800 hover:bg-green-100"
                              )}
                            >
                              {p.status === "ativo" ? "Ativo" : "Quitado"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground"
                                onClick={() => handleEdit(p)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  if (confirm("Tem certeza que deseja excluir esta parcela?")) {
                                    deleteMutation.mutate(p.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-l-4 border-l-[#6A1B9A]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#6A1B9A]" /> Resumo de Parcelas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total Ativas</span>
                  <span className="font-bold">
                    {parcelas?.filter(p => p.status === "ativo").length || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Comprometimento Mensal</span>
                  <span className="font-bold text-red-700">
                    {formatarBRL(parcelas?.filter(p => p.status === "ativo").reduce((acc, p) => acc + Number(p.valor_parcela), 0) || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#FFF3CD]/30 border-[#F9A825]/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#F9A825] flex items-center gap-2">
                <AlertCircle className="h-3 w-3" /> Info Importante
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground leading-relaxed">
              Parcelas com status <strong>Ativo</strong> são somadas automaticamente nas despesas dos meses correspondentes. 
              A data base para ordenação é o dia da 1ª parcela.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
