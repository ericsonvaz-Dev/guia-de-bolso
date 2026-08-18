import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  // A sessão do Supabase vive no localStorage; renderizar só no cliente evita
  // divergência de hidratação entre o HTML do servidor e o estado real.
  ssr: false,
  head: () => ({

    meta: [
      { title: "Entrar | Controle Financeiro Pessoal" },
      {
        name: "description",
        content:
          "Acesse sua conta para controlar receitas, despesas, contas fixas e parcelas em reais.",
      },
      { property: "og:title", content: "Entrar | Controle Financeiro Pessoal" },
      {
        property: "og:description",
        content: "Acesse sua conta para controlar receitas, despesas, contas fixas e parcelas.",
      },
    ],
  }),
  component: PaginaAuth,
});

/** Traduz as mensagens de erro do Supabase Auth para pt-BR. */
function traduzirErro(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Este e-mail já está cadastrado. Faça login.";
  if (m.includes("password should be at least"))
    return "A senha deve ter no mínimo 6 caracteres.";
  if (m.includes("unable to validate email")) return "E-mail inválido.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas. Aguarde alguns instantes.";
  return "Não foi possível concluir. Tente novamente.";
}

function PaginaAuth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);

  // Se já existe sessão, vai direto para o Dashboard.
  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (ativo && data.session) {
        navigate({ to: "/dashboard", replace: true });
      }
    });
    return () => {
      ativo = false;
    };
  }, [navigate]);

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault();
    setCarregando(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) {
        toast.error(traduzirErro(error.message));
        return;
      }
      toast.success("Bem-vindo de volta!");
      navigate({ to: "/dashboard", replace: true });
    } catch (erro) {
      console.error(erro);
      toast.error("Erro inesperado ao entrar.");
    } finally {
      setCarregando(false);
    }
  }

  async function cadastrar(evento: React.FormEvent) {
    evento.preventDefault();
    if (senha.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    setCarregando(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        toast.error(traduzirErro(error.message));
        return;
      }
      if (!data.session) {
        setAguardandoConfirmacao(true);
        toast.success("Cadastro criado! Confirme seu e-mail para entrar.");
        return;
      }
      toast.success("Conta criada com sucesso!");
      navigate({ to: "/dashboard", replace: true });
    } catch (erro) {
      console.error(erro);
      toast.error("Erro inesperado ao cadastrar.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="size-6" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Controle Financeiro Pessoal
          </h1>
          <p className="text-sm text-muted-foreground">
            Organize receitas, despesas, contas fixas e parcelas em reais.
          </p>
        </div>

        {aguardandoConfirmacao ? (
          <Card>
            <CardHeader>
              <CardTitle>Confirme seu e-mail</CardTitle>
              <CardDescription>
                Enviamos um link de confirmação para <strong>{email}</strong>. Após confirmar,
                volte aqui e faça login.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setAguardandoConfirmacao(false)}
              >
                Voltar ao login
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="login">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="cadastro">Criar conta</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={entrar} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-login">E-mail</Label>
                      <Input
                        id="email-login"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="voce@email.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="senha-login">Senha</Label>
                      <Input
                        id="senha-login"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={carregando}>
                      {carregando && <Loader2 className="mr-2 size-4 animate-spin" />}
                      Entrar
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="cadastro">
                  <form onSubmit={cadastrar} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-cadastro">E-mail</Label>
                      <Input
                        id="email-cadastro"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="voce@email.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="senha-cadastro">Senha</Label>
                      <Input
                        id="senha-cadastro"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={6}
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        placeholder="Mínimo de 6 caracteres"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={carregando}>
                      {carregando && <Loader2 className="mr-2 size-4 animate-spin" />}
                      Criar conta
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Ao criar a conta, suas categorias padrão e as 7 contas fixas são
                      configuradas automaticamente.
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
