import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, User, Lock, Eye, EyeOff, ShieldCheck, TrendingUp } from "lucide-react";
import heroAsset from "@/assets/login-hero.jpeg.asset.json";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
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
  if (m.includes("email rate limit exceeded")) return "Limite de e-mails excedido. Tente novamente em alguns minutos.";
  return "Não foi possível concluir. Tente novamente.";
}

function PaginaAuth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [modo, setModo] = useState<"login" | "cadastro" | "reset">("login");

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
        options: { emailRedirectTo: `${window.location.origin}/auth` },
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

  async function resetSenha(evento: React.FormEvent) {
    evento.preventDefault();
    setCarregando(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      if (error) {
        toast.error(traduzirErro(error.message));
        return;
      }
      toast.success("E-mail de recuperação enviado!");
      setModo("login");
    } catch (erro) {
      console.error(erro);
      toast.error("Erro ao enviar e-mail de recuperação.");
    } finally {
      setCarregando(false);
    }
  }

  if (aguardandoConfirmacao) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBEEF0] px-4">
        <Card className="w-full max-w-md rounded-2xl border-none shadow-xl">
          <CardContent className="flex flex-col items-center p-8 text-center">
            <div className="mb-6 rounded-full bg-green-100 p-3 text-green-600">
              <ShieldCheck className="size-12" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-[#1a1a2e]">Confirme seu e-mail</h2>
            <p className="mb-8 text-muted-foreground">
              Enviamos um link de confirmação para <strong>{email}</strong>. 
              Após confirmar, você poderá acessar sua conta.
            </p>
            <Button
              className="w-full rounded-xl bg-[#6D4AE0] hover:bg-[#5a3bb8]"
              onClick={() => setAguardandoConfirmacao(false)}
            >
              Voltar ao login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [montado, setMontado] = useState(false);
  useEffect(() => { setMontado(true); }, []);

  if (!montado) return null;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* COLUNA ESQUERDA: Imagem */}
      <div className="hidden items-center justify-center bg-[#FBEEF0] p-12 lg:flex">
        <div className="relative h-full w-full max-w-2xl overflow-hidden rounded-3xl">
          <img
            src={heroAsset.url}
            alt="Ilustração Controle Financeiro"
            className="h-full w-full object-contain"
          />
        </div>
      </div>

      {/* COLUNA DIREITA: Formulário */}
      <div className="flex items-center justify-center bg-[#FBEEF0] p-6 lg:bg-white lg:p-12">
        <Card className="w-full max-w-[400px] border-none bg-white shadow-xl ring-1 ring-black/5 lg:shadow-2xl rounded-2xl overflow-hidden">
          <CardContent className="p-8">
            {/* Logo e Título */}
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-white shadow-md">
                <div className="relative">
                  <TrendingUp className="size-7 text-[#2E7D32]" />
                  <div className="absolute -right-1 -top-1 size-3 rounded-full bg-[#1F4E78]" />
                </div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[#1a1a2e]">
                Controle Financeiro
              </h1>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                Organize · Acompanhe · Cresça
              </p>
            </div>

            {/* Alternador de Modo */}
            {modo !== "reset" && (
              <div className="mb-6 flex rounded-xl bg-muted p-1">
                <button
                  onClick={() => setModo("login")}
                  className={cn(
                    "flex-1 rounded-lg py-2 text-sm font-medium transition-all",
                    modo === "login" 
                      ? "bg-white text-[#1a1a2e] shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Entrar
                </button>
                <button
                  onClick={() => setModo("cadastro")}
                  className={cn(
                    "flex-1 rounded-lg py-2 text-sm font-medium transition-all",
                    modo === "cadastro" 
                      ? "bg-white text-[#1a1a2e] shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Criar conta
                </button>
              </div>
            )}

            {/* Formulários */}
            <form 
              onSubmit={modo === "login" ? entrar : modo === "cadastro" ? cadastrar : resetSenha} 
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-[#1a1a2e]">
                  {modo === "reset" ? "Seu e-mail cadastrado" : "Usuário"}
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@email.com"
                    className="h-11 rounded-xl border-muted bg-white pl-10 focus-visible:ring-[#6D4AE0]"
                  />
                </div>
              </div>

              {modo !== "reset" && (
                <div className="space-y-2">
                  <Label htmlFor="senha" className="text-sm font-semibold text-[#1a1a2e]">
                    Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="senha"
                      type={mostrarSenha ? "text" : "password"}
                      required
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder={modo === "cadastro" ? "Mínimo 6 caracteres" : "••••••••"}
                      className="h-11 rounded-xl border-muted bg-white pl-10 pr-10 focus-visible:ring-[#6D4AE0]"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {mostrarSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="h-11 w-full rounded-xl bg-[#6D4AE0] font-semibold text-white transition-colors hover:bg-[#5a3bb8] disabled:opacity-70"
                disabled={carregando}
              >
                {carregando ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    {modo === "login" ? "Entrando..." : modo === "cadastro" ? "Criando..." : "Enviando..."}
                  </span>
                ) : (
                  modo === "login" ? "Entrar" : modo === "cadastro" ? "Criar conta" : "Recuperar Senha"
                )}
              </Button>

              {modo === "login" && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setModo("reset")}
                    className="text-xs font-semibold text-[#6D4AE0] hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}

              {modo === "reset" && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setModo("login")}
                    className="text-xs font-semibold text-[#6D4AE0] hover:underline"
                  >
                    Voltar ao login
                  </button>
                </div>
              )}
            </form>

            {/* Rodapé do Card */}
            <div className="mt-8 flex items-center justify-center gap-2 border-t pt-6 text-[10px] text-muted-foreground uppercase tracking-widest">
              <ShieldCheck className="size-3" />
              <span>Seus dados protegidos</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
