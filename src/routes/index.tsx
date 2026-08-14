import { createFileRoute, redirect } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  // A sessão vive no localStorage do navegador, então a decisão é client-side.
  ssr: false,
  head: () => ({
    meta: [
      { title: "Controle Financeiro Pessoal | Receitas, despesas e parcelas" },
      {
        name: "description",
        content:
          "App de controle financeiro pessoal em reais: lançamentos mensais, contas fixas e parcelas com status pago ou pendente.",
      },
      {
        property: "og:title",
        content: "Controle Financeiro Pessoal | Receitas, despesas e parcelas",
      },
      {
        property: "og:description",
        content:
          "Organize lançamentos mensais, contas fixas e parcelas em reais, com saldo sempre à vista.",
      },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    throw redirect({ to: data.session ? "/dashboard" : "/auth", replace: true });
  },
  component: () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="size-6 animate-spin text-primary" />
      <span className="sr-only">Carregando…</span>
    </div>
  ),
});
