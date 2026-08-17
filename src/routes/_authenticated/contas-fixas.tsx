import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Pencil, 
  AlertCircle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatarBRL, paraNumero } from "@/lib/formatadores";
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
import { Switch } from "@/components/ui/switch";
import { Tables } from "@/integrations/supabase/types";

type ContaFixa = Tables<"contas_fixas">;
type Categoria = Tables<"categorias">;

const formSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  categoria_id: z.string().min(1, "Categoria é obrigatória"),
  valor: z.number().min(0.01, "Valor deve ser maior que zero"),
  dia: z.number().min(1, "Dia mínimo 1").max(31, "Dia máximo 31"),
  ativo: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export const Route = createFileRoute("/_authenticated/contas-fixas")({
  head: () => ({
    meta: [
      { title: "Contas Fixas | Controle Financeiro Pessoal" },
      {
        name: "description",
        content: "Gerencie suas despesas fixas mensais recorrentes.",
      },
    ],
  }),
  component: PaginaContasFixas,
});

function PaginaContasFixas() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaFixa | null>(null);

  const { data: contas, isLoading: isLoadingContas } = useQuery({
    queryKey: ["contas-fixas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_fixas")
        .select(`
          *,
          categorias (
            nome,
            cor
          )
        `)
        .order("dia", { ascending: true });

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

  const fixCategoriesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("fix_user_categories");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias-despesas"] });
      toast.success("Categorias padrão adicionadas!");
    },
    onError: (error: any) => {
      toast.error("Erro ao adicionar categorias: " + error.message);
    },
  });

  const form = useForm<FormValues>({

  const upsertMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const payload = {
        descricao: values.descricao,
        categoria_id: values.categoria_id,
        valor: values.valor,
        dia: values.dia,
        ativo: values.ativo,
        user_id: user.id,
      };

      if (editingConta) {
        const { error } = await supabase
          .from("contas_fixas")
          .update(payload)
          .eq("id", editingConta.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("contas_fixas")
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-fixas"] });
      queryClient.invalidateQueries({ queryKey: ["dados-financeiros"] });
      toast.success(editingConta ? "Conta fixa atualizada!" : "Conta fixa criada!");
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar conta: " + error.message);
    },
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("contas_fixas")
        .update({ ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-fixas"] });
      queryClient.invalidateQueries({ queryKey: ["dados-financeiros"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao mudar status: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contas_fixas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas-fixas"] });
      queryClient.invalidateQueries({ queryKey: ["dados-financeiros"] });
      toast.success("Conta fixa excluída!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir: " + error.message);
    },
  });

  const handleEdit = (conta: any) => {
    setEditingConta(conta);
    form.reset({
      descricao: conta.descricao,
      categoria_id: conta.categoria_id,
      valor: paraNumero(conta.valor),
      dia: paraNumero(conta.dia),
      ativo: conta.ativo,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingConta(null);
    form.reset({
      descricao: "",
      categoria_id: "",
      valor: 0,
      dia: 1,
      ativo: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas Fixas</h1>
          <p className="text-muted-foreground">
            Despesas recorrentes que entram automaticamente todo mês.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingConta(null)} className="bg-[#1F4E78] hover:bg-[#1F4E78]/90 text-white">
              <Plus className="mr-2 h-4 w-4" /> Nova Conta Fixa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingConta ? "Editar Conta Fixa" : "Nova Conta Fixa"}</DialogTitle>
              <DialogDescription>
                Informe os dados da despesa recorrente.
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
                        <Input placeholder="Ex: Aluguel, Internet..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
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
                        {categorias?.length === 0 && (
                          <div className="mt-2 text-xs text-destructive flex flex-col gap-1">
                            <span>Nenhuma categoria encontrada.</span>
                            <Button 
                              type="button" 
                              variant="link" 
                              size="sm" 
                              className="h-auto p-0 text-[#1F4E78] justify-start"
                              onClick={() => fixCategoriesMutation.mutate()}
                              disabled={fixCategoriesMutation.isPending}
                            >
                              Clique aqui para criar as categorias padrão
                            </Button>
                          </div>
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dia do Vencimento</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="31" 
                            value={field.value}
                            onChange={(e) => field.onChange(paraNumero(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                  name="ativo"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Ativa</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Se desativada, não aparecerá nos meses seguintes.
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-[#1F4E78] hover:bg-[#1F4E78]/90 text-white" disabled={upsertMutation.isPending}>
                    {editingConta ? "Salvar Alterações" : "Criar Conta"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Dia</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingContas ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : contas?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Nenhuma conta fixa cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                contas?.map((conta) => (
                  <TableRow key={conta.id} className={!conta.ativo ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{String(conta.dia).padStart(2, "0")}</TableCell>
                    <TableCell>{conta.descricao}</TableCell>
                    <TableCell>
                      {conta.categorias && (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: (conta.categorias as any).cor }} 
                          />
                          <span>{(conta.categorias as any).nome}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-[#C62828] font-medium">
                      {formatarBRL(Number(conta.valor))}
                    </TableCell>
                    <TableCell>
                      <Switch 
                        checked={conta.ativo} 
                        onCheckedChange={(checked) => toggleAtivoMutation.mutate({ id: conta.id, ativo: checked })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(conta)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("Deseja realmente excluir esta conta fixa?")) {
                              deleteMutation.mutate(conta.id);
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
        </CardContent>
      </Card>

      <div className="bg-[#FFF3CD] border border-[#F9A825] p-4 rounded-lg flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-[#F9A825] shrink-0 mt-0.5" />
        <div className="text-sm text-[#F9A825]">
          <p className="font-semibold">Como funciona?</p>
          <p>As contas fixas ativas são lançadas automaticamente na sua tela de "Mês" como pendentes. Você pode marcar como pago individualmente em cada mês sem afetar a configuração original aqui.</p>
          <p className="mt-2 text-xs opacity-80 italic">
            Dica: Se ao adicionar uma conta não houver nenhuma categoria, adicione as seguintes opções: Moradia, Contas da Casa, Alimentação, Transporte, Saúde, Compras, Lazer, Viagens, Educação.
          </p>
        </div>
      </div>
    </div>
  );
}
