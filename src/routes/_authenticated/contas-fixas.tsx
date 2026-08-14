import { createFileRoute } from "@tanstack/react-router";
import { Receipt } from "lucide-react";

import { PaginaEmConstrucao } from "@/components/pagina-em-construcao";

export const Route = createFileRoute("/_authenticated/contas-fixas")({
  head: () => ({
    meta: [
      { title: "Contas Fixas | Controle Financeiro Pessoal" },
      {
        name: "description",
        content: "Gerencie suas contas fixas mensais, com dia de vencimento e valor em reais.",
      },
      { property: "og:title", content: "Contas Fixas | Controle Financeiro Pessoal" },
      {
        property: "og:description",
        content: "Gerencie suas contas fixas mensais, com dia de vencimento e valor.",
      },
    ],
  }),
  component: () => (
    <PaginaEmConstrucao
      titulo="Contas Fixas"
      descricao="Despesas recorrentes com dia de vencimento e valor."
      icone={Receipt}
      acento="negativo"
    />
  ),
});
