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
import { useForm } from "react-hook-form";
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
  data_primeira_parcela: z.string().nullable().transform(val => val || new Date().toISOString().split("T")[0]),
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
    const totalMeses = Number(watchValues.num_parcelas);
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
        descricao: values.descricao,
        categoria_id: values.categoria_id,
        valor_parcela: values.valor_parcela,
        num_parcelas: values.num_parcelas,
        mes_inicio: values.mes_inicio,
        ano_inicio: values.ano_inicio,
        data_primeira_parcela: values.data_primeira_parcela,
        status: values.status,
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
    onError: (error: any) => {
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
    onError: (error: any) => {
      toast.error("Erro ao excluir: " + error.message);
    },
  });

  const handleEdit = (parcela: any) => {
    setEditingParcela(parcela);
    form.reset({
      descricao: parcela.descricao,
      categoria_id: parcela.categoria_id,
      valor_parcela: paraNumero(parcela.valor_parcela),
      num_parcelas: paraNumero(parcela.num_parcelas),
      mes_inicio: paraNumero(parcela.mes_inicio),
      ano_inicio: paraNumero(parcela.ano_inicio),
      data_primeira_parcela: parcela.data_primeira_parcela || new Date().toISOString().split("T")[0],
      status: parcela.status as "ativo" | "quitado",
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingParcela(null);
    form.reset({
      descricao: "",
      categoria_id: "",
      valor_parcela: 0,
      num_parcelas: 1,
      mes_inicio: new Date().getMonth() + 1,
      ano_inicio: new Date().getFullYear(),
      data_primeira_parcela: new Date().toISOString().split("T")[0],
      status: "ativo",
    });
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
                    name="valor_parcela"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor da Parcela (R$)</FormLabel>
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
                    name="num_parcelas"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nº de Parcelas</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
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
                            onChange={(e) => field.onChange(paraNumero(e.target.value))}
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
                        <Select onValueChange={field.onChange} value={field.value || "ativo"}>
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
                      Total: {formatarBRL(Number(watchValues.valor_parcela) * (Number(watchValues.num_parcelas) || 0))}
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
                          Nenhuma compra parcelada cadastrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      parcelas?.map((parcela) => (
                        <TableRow key={parcela.id}>
                          <TableCell className="font-medium">{parcela.descricao}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: (parcela.categorias as any)?.cor }} 
                              />
                              {(parcela.categorias as any)?.nome}
                            </div>
                          </TableCell>
                          <TableCell>{formatarBRL(parcela.valor_parcela)}</TableCell>
                          <TableCell>{parcela.num_parcelas}x</TableCell>
                          <TableCell>{nomeDoMes(parcela.mes_inicio)}/{parcela.ano_inicio}</TableCell>
                          <TableCell className="font-bold text-[#6A1B9A]">
                            {formatarBRL(paraNumero(parcela.valor_parcela) * paraNumero(parcela.num_parcelas))}
                          </TableCell>
                          <TableCell>
                            <Badge variant={parcela.status === "ativo" ? "default" : "secondary"} className={cn(
                              parcela.status === "ativo" ? "bg-[#6A1B9A] text-white" : ""
                            )}>
                              {parcela.status === "ativo" ? "Ativa" : "Quitada"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(parcela)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  if (confirm("Tem certeza que deseja excluir esta parcela?")) {
                                    deleteMutation.mutate(parcela.id);
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
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4 text-[#6A1B9A]" /> Dica
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                As parcelas cadastradas aqui como <strong>Ativas</strong> são incluídas automaticamente nas despesas dos meses correspondentes.
              </p>
              <p>
                A regra de cálculo utiliza o <strong>índice absoluto</strong> do mês, garantindo que parcelas que atravessam viradas de ano sejam exibidas corretamente.
              </p>
              <div className="mt-4 p-3 bg-[#6A1B9A]/5 border border-[#6A1B9A]/20 rounded-md">
                <p className="text-[#6A1B9A] font-medium flex items-center gap-1 text-xs">
                  <CheckCircle2 className="h-3 w-3" /> Automação Ativa
                </p>
                <p className="text-[11px] mt-1">
                  Você não precisa adicionar essas despesas manualmente todos os meses.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[#6A1B9A]" /> Status
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span>Ativas:</span>
                <span className="font-bold">{parcelas?.filter(p => p.status === 'ativo').length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Quitadas:</span>
                <span className="font-bold">{parcelas?.filter(p => p.status === 'quitado').length || 0}</span>
              </div>
              <div className="pt-2 border-t mt-2">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Comprometimento Total:</span>
                  <span className="text-lg font-bold text-[#6A1B9A]">
                    {formatarBRL(parcelas?.filter(p => p.status === 'ativo').reduce((acc, p) => acc + (paraNumero(p.valor_parcela) * paraNumero(p.num_parcelas)), 0) || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
