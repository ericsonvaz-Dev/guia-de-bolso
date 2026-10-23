import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Info, Pencil, PiggyBank, Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { formatarBRL, formatarData, nomeDoMes, paraNumero } from "@/lib/formatadores";
import {
  resumirInvestimentos,
  rotuloTipoAtivo,
  TIPOS_ATIVO,
  type MovimentoInvestimento,
} from "@/lib/investimentos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/investimentos")({
  head: () => ({
    meta: [
      { title: "Investimentos | Controle Financeiro Pessoal" },
      {
        name: "description",
        content: "Controle onde e quanto você está investindo.",
      },
    ],
  }),
  component: PaginaInvestimentos,
});

const formSchema = z.object({
  movimento: z.enum(["aporte", "resgate"]),
  nome: z.string().trim().min(1, "Informe o nome do investimento"),
  tipo_ativo: z.enum([
    "renda_fixa",
    "tesouro",
    "acoes",
    "fiis",
    "fundos",
    "cripto",
    "previdencia",
    "outros",
  ]),
  instituicao: z.string().trim().min(1, "Informe onde o dinheiro está"),
  valor: z.number().min(0.01, "Valor deve ser maior que zero"),
  data: z.string().min(1, "Data é obrigatória"),
  observacao: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

const hojeISO = () => format(new Date(), "yyyy-MM-dd");

const valoresIniciais = (): FormValues => ({
  movimento: "aporte",
  nome: "",
  tipo_ativo: "renda_fixa",
  instituicao: "",
  valor: 0,
  data: hojeISO(),
  observacao: "",
});

const percentual = (v: number) => `${Math.round(v * 100)}%`;

function PaginaInvestimentos() {
  const queryClient = useQueryClient();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<MovimentoInvestimento | null>(null);

  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();

  const { data: movimentos, isLoading } = useQuery({
    queryKey: ["investimentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investimentos")
        .select("*")
        .order("data", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const resumo = useMemo(
    () => resumirInvestimentos(movimentos ?? [], mesAtual, anoAtual),
    [movimentos, mesAtual, anoAtual],
  );

  const mesCorrente = resumo.ultimosMeses[resumo.ultimosMeses.length - 1];
  const maiorMes = Math.max(1, ...resumo.ultimosMeses.map((m) => Math.max(m.aportado, m.resgatado)));

  // Sugestões para digitar mais rápido, com o que você já usou.
  const nomesExistentes = useMemo(
    () => [...new Set((movimentos ?? []).map((m) => m.nome.trim()))],
    [movimentos],
  );
  const instituicoesExistentes = useMemo(
    () => [...new Set((movimentos ?? []).map((m) => m.instituicao.trim()))],
    [movimentos],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: valoresIniciais(),
  });

  const salvar = useMutation({
    mutationFn: async (values: FormValues) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const payload = {
        user_id: user.id,
        movimento: values.movimento,
        nome: values.nome.trim(),
        tipo_ativo: values.tipo_ativo,
        instituicao: values.instituicao.trim(),
        valor: values.valor,
        data: values.data,
        observacao: values.observacao.trim() || null,
      };

      if (editando) {
        const { error } = await supabase.from("investimentos").update(payload).eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("investimentos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, values) => {
      queryClient.invalidateQueries({ queryKey: ["investimentos"] });
      toast.success(
        editando
          ? "Movimentação atualizada!"
          : values.movimento === "aporte"
            ? "Aporte registrado!"
            : "Resgate registrado!",
      );
      fecharDialog();
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("investimentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investimentos"] });
      toast.success("Movimentação excluída!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir: " + error.message);
    },
  });

  const abrirNovo = (movimento: "aporte" | "resgate") => {
    setEditando(null);
    form.reset({ ...valoresIniciais(), movimento });
    setDialogAberto(true);
  };

  const abrirEdicao = (m: MovimentoInvestimento) => {
    setEditando(m);
    form.reset({
      movimento: m.movimento,
      nome: m.nome,
      tipo_ativo: m.tipo_ativo,
      instituicao: m.instituicao,
      valor: paraNumero(m.valor),
      data: m.data,
      observacao: m.observacao ?? "",
    });
    setDialogAberto(true);
  };

  const fecharDialog = () => {
    setDialogAberto(false);
    setEditando(null);
    form.reset(valoresIniciais());
  };

  const movimentoForm = form.watch("movimento");

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Investimentos</h1>
          <p className="text-muted-foreground">
            Onde e quanto você está investindo. Registre cada aporte e cada resgate.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => abrirNovo("resgate")}>
            <ArrowDownLeft className="mr-2 h-4 w-4" /> Resgate
          </Button>
          <Button onClick={() => abrirNovo("aporte")}>
            <Plus className="mr-2 h-4 w-4" /> Novo aporte
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (movimentos ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center space-y-3">
            <PiggyBank className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="font-medium">Você ainda não registrou nenhum investimento.</p>
            <p className="text-sm text-muted-foreground">
              Clique em "Novo aporte" e informe onde colocou o dinheiro, o tipo e o valor.
            </p>
            <Button onClick={() => abrirNovo("aporte")}>
              <Plus className="mr-2 h-4 w-4" /> Registrar primeiro aporte
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 1. Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total investido</p>
                <p className="text-2xl font-bold text-primary">{formatarBRL(resumo.totalInvestido)}</p>
                <p className="text-[11px] text-muted-foreground">
                  aportes menos resgates, por investimento
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">
                  Aportado em {nomeDoMes(mesAtual)}
                </p>
                <p className="text-2xl font-bold text-receita">
                  {formatarBRL(mesCorrente?.aportado ?? 0)}
                </p>
                <p className="text-[11px] text-muted-foreground">neste mês</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total aportado</p>
                <p className="text-2xl font-bold">{formatarBRL(resumo.totalAportado)}</p>
                <p className="text-[11px] text-muted-foreground">desde o primeiro registro</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total resgatado</p>
                <p className="text-2xl font-bold">{formatarBRL(resumo.totalResgatado)}</p>
                <p className="text-[11px] text-muted-foreground">desde o primeiro registro</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Os valores mostram o que <strong>você colocou</strong>, não quanto rende. Rendimentos e
              cotações não são calculados aqui. Esta aba é separada do saldo do mês: aportes não
              entram nas despesas nem na tela Análise.
            </p>
          </div>

          {/* 2. Onde está o dinheiro */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Onde está o seu dinheiro</CardTitle>
              <CardDescription>
                Cada investimento com a instituição onde ele está e quanto da carteira ele representa.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Investimento</TableHead>
                      <TableHead>Onde</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Investido</TableHead>
                      <TableHead className="text-right">% da carteira</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumo.posicoes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Tudo o que foi aportado já foi resgatado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      resumo.posicoes.map((p) => (
                        <TableRow key={p.chave}>
                          <TableCell className="font-medium">{p.nome}</TableCell>
                          <TableCell>{p.instituicao}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {rotuloTipoAtivo(p.tipoAtivo)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatarBRL(p.investido)}
                          </TableCell>
                          <TableCell className="text-right">
                            {percentual(resumo.totalInvestido > 0 ? p.investido / resumo.totalInvestido : 0)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* 3 e 4. Por tipo e por instituição */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[
              {
                titulo: "2. Divisão por tipo",
                descricao: "Quanto está em renda fixa, ações, FIIs etc.",
                grupos: resumo.porTipo,
              },
              {
                titulo: "3. Divisão por instituição",
                descricao: "Em qual banco ou corretora está cada parte.",
                grupos: resumo.porInstituicao,
              },
            ].map((bloco) => (
              <Card key={bloco.titulo}>
                <CardHeader>
                  <CardTitle className="text-lg">{bloco.titulo}</CardTitle>
                  <CardDescription>{bloco.descricao}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {bloco.grupos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem dados.</p>
                  ) : (
                    bloco.grupos.map((g) => (
                      <div key={g.rotulo} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{g.rotulo}</span>
                          <span className="font-semibold">
                            {formatarBRL(g.total)}{" "}
                            <span className="text-xs font-normal text-muted-foreground">
                              ({percentual(g.parte)})
                            </span>
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${Math.max(g.parte * 100, 2)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 5. Evolução mensal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">4. Quanto você investiu por mês</CardTitle>
              <CardDescription>Aportes (verde) e resgates (cinza) dos últimos 6 meses.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {resumo.ultimosMeses.map((m) => (
                <div key={m.chave} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {nomeDoMes(m.mes)}/{m.ano}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatarBRL(m.aportado)} aportado
                      {m.resgatado > 0 && ` · ${formatarBRL(m.resgatado)} resgatado`}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-receita"
                      style={{ width: `${(m.aportado / maiorMes) * 100}%` }}
                    />
                  </div>
                  {m.resgatado > 0 && (
                    <div className="h-1.5 w-full rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-muted-foreground/50"
                        style={{ width: `${(m.resgatado / maiorMes) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 6. Histórico */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">5. Histórico de movimentações</CardTitle>
              <CardDescription>Todos os aportes e resgates, do mais recente ao mais antigo.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[110px]">Data</TableHead>
                      <TableHead>Movimento</TableHead>
                      <TableHead>Investimento</TableHead>
                      <TableHead>Onde</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-[100px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(movimentos ?? []).map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs font-medium">{formatarData(m.data)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={m.movimento === "aporte" ? "default" : "secondary"}
                            className="gap-1"
                          >
                            {m.movimento === "aporte" ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownLeft className="h-3 w-3" />
                            )}
                            {m.movimento === "aporte" ? "Aporte" : "Resgate"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{m.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {rotuloTipoAtivo(m.tipo_ativo)}
                            {m.observacao ? ` · ${m.observacao}` : ""}
                          </p>
                        </TableCell>
                        <TableCell>{m.instituicao}</TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-semibold",
                            m.movimento === "aporte" ? "text-receita" : "text-muted-foreground",
                          )}
                        >
                          {m.movimento === "aporte" ? "+" : "-"} {formatarBRL(m.valor)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Editar"
                              onClick={() => abrirEdicao(m)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Excluir"
                              className="text-destructive"
                              onClick={() => {
                                if (confirm("Excluir esta movimentação? Isso muda o total investido.")) {
                                  excluir.mutate(m.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={dialogAberto} onOpenChange={(aberto) => (aberto ? setDialogAberto(true) : fecharDialog())}>
        <DialogContent className="sm:max-w-[460px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar movimentação" : movimentoForm === "aporte" ? "Novo aporte" : "Novo resgate"}
            </DialogTitle>
            <DialogDescription>
              {movimentoForm === "aporte"
                ? "Registre o dinheiro que você colocou em um investimento."
                : "Registre o dinheiro que você tirou de um investimento."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => salvar.mutate(v))} className="space-y-4">
              <FormField
                control={form.control}
                name="movimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de movimentação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="aporte">Aporte (coloquei dinheiro)</SelectItem>
                        <SelectItem value="resgate">Resgate (tirei dinheiro)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do investimento</FormLabel>
                    <FormControl>
                      <Input
                        list="sugestoes-nomes"
                        placeholder="Ex: Tesouro Selic 2029, CDB 110% CDI, PETR4"
                        {...field}
                      />
                    </FormControl>
                    <datalist id="sugestoes-nomes">
                      {nomesExistentes.map((n) => (
                        <option key={n} value={n} />
                      ))}
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tipo_ativo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIPOS_ATIVO.map((t) => (
                            <SelectItem key={t.valor} value={t.valor}>
                              {t.rotulo}
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
                  name="instituicao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Onde (banco/corretora)</FormLabel>
                      <FormControl>
                        <Input list="sugestoes-instituicoes" placeholder="Ex: Nubank, XP, Inter" {...field} />
                      </FormControl>
                      <datalist id="sugestoes-instituicoes">
                        {instituicoesExistentes.map((i) => (
                          <option key={i} value={i} />
                        ))}
                      </datalist>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                name="observacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observação (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: aporte mensal, meta viagem" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={fecharDialog}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={salvar.isPending}>
                  {salvar.isPending ? "Salvando..." : editando ? "Salvar alterações" : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
