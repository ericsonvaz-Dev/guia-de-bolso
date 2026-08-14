import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";

import { PaginaEmConstrucao } from "@/components/pagina-em-construcao";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Controle Financeiro Pessoal" },
      {
        name: "description",
        content: "Visão geral do seu ano financeiro: receitas, despesas e saldo em reais.",
      },
      { property: "og:title", content: "Dashboard | Controle Financeiro Pessoal" },
      {
        property: "og:description",
        content: "Visão geral do seu ano financeiro: receitas, despesas e saldo.",
      },
    ],
  }),
  component: () => (
    <PaginaEmConstrucao
      titulo="Dashboard"
      descricao="Visão geral anual de receitas, despesas e saldo."
      icone={LayoutDashboard}
      acento="saldo"
    />
  ),
});
