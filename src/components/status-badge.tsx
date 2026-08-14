import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export type StatusFinanceiro = "pago" | "pendente";
export type StatusParcela = "ativo" | "quitado";

export interface StatusBadgeProps extends ComponentProps<"span"> {
  /** Status do lançamento: 'pago' ou 'pendente'. */
  status: StatusFinanceiro;
}

const ROTULOS: Record<StatusFinanceiro, string> = {
  pago: "Pago",
  pendente: "Pendente",
};

/** Selo de status usando exclusivamente os tokens do design system. */
export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "pago" && "bg-pago-bg text-pago",
        status === "pendente" && "bg-pendente-bg text-pendente",
        className,
      )}
      {...props}
    >
      {ROTULOS[status]}
    </span>
  );
}
