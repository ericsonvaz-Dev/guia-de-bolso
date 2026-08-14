import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface PaginaEmConstrucaoProps {
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  /** Token de acento do design system usado no ícone. */
  acento?: "primary" | "receita" | "negativo" | "parcela" | "saldo";
}

const ACENTOS: Record<NonNullable<PaginaEmConstrucaoProps["acento"]>, string> = {
  primary: "bg-primary/10 text-primary",
  receita: "bg-receita/10 text-receita",
  negativo: "bg-negativo/10 text-negativo",
  parcela: "bg-parcela/10 text-parcela",
  saldo: "bg-saldo/10 text-saldo",
};

/** Placeholder das telas internas — a lógica entra nas próximas etapas. */
export function PaginaEmConstrucao({
  titulo,
  descricao,
  icone: Icone,
  acento = "primary",
}: PaginaEmConstrucaoProps) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${ACENTOS[acento]}`}
        >
          <Icone className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            {titulo}
          </h1>
          <p className="text-sm text-muted-foreground">{descricao}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Em construção</CardTitle>
          <CardDescription>
            Esta tela ainda não foi implementada. A estrutura de navegação e o design system já
            estão prontos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-receita/10 px-2.5 py-1 font-medium text-receita">
              Receita
            </span>
            <span className="rounded-full bg-negativo/10 px-2.5 py-1 font-medium text-negativo">
              Déficit
            </span>
            <span className="rounded-full bg-saldo/10 px-2.5 py-1 font-medium text-saldo">
              Saldo positivo
            </span>
            <span className="rounded-full bg-pago-bg px-2.5 py-1 font-medium text-pago">Pago</span>
            <span className="rounded-full bg-pendente-bg px-2.5 py-1 font-medium text-pendente">
              Pendente
            </span>
            <span className="rounded-full bg-parcela/10 px-2.5 py-1 font-medium text-parcela">
              Parcelas
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
