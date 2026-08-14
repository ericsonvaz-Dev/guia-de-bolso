import { createFileRoute } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";

import { PaginaEmConstrucao } from "@/components/pagina-em-construcao";

export const Route = createFileRoute("/_authenticated/parcelas")({
  head: () => ({
    meta: [
      { title: "Parcelas | Controle Financeiro Pessoal" },
      {
        name: "description",
        content: "Acompanhe compras parceladas: valor da parcela, quantidade e status.",
      },
      { property: "og:title", content: "Parcelas | Controle Financeiro Pessoal" },
      {
        property: "og:description",
        content: "Acompanhe compras parceladas: valor da parcela, quantidade e status.",
      },
    ],
  }),
  component: () => (
    <PaginaEmConstrucao
      titulo="Parcelas"
      descricao="Compras parceladas, com valor da parcela e período."
      icone={CreditCard}
      acento="parcela"
    />
  ),
});
