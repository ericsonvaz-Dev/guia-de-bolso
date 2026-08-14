import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";

import { PaginaEmConstrucao } from "@/components/pagina-em-construcao";

export const Route = createFileRoute("/_authenticated/mes")({
  head: () => ({
    meta: [
      { title: "Mês | Controle Financeiro Pessoal" },
      {
        name: "description",
        content: "Lançamentos do mês com status pago ou pendente, valores em reais.",
      },
      { property: "og:title", content: "Mês | Controle Financeiro Pessoal" },
      {
        property: "og:description",
        content: "Lançamentos do mês com status pago ou pendente.",
      },
    ],
  }),
  component: () => (
    <PaginaEmConstrucao
      titulo="Mês"
      descricao="Lançamentos do mês selecionado, com status pago e pendente."
      icone={CalendarDays}
      acento="primary"
    />
  ),
});
