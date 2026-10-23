import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  LogOut,
  PiggyBank,
  Receipt,
  SearchCheck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const ITENS = [
  { titulo: "Dashboard", url: "/dashboard", icone: LayoutDashboard },
  { titulo: "Mês", url: "/mes", icone: CalendarDays },
  { titulo: "Contas Fixas", url: "/contas-fixas", icone: Receipt },
  { titulo: "Parcelas", url: "/parcelas", icone: CreditCard },
  { titulo: "Análise", url: "/analise", icone: SearchCheck },
  { titulo: "Investimentos", url: "/investimentos", icone: PiggyBank },
] as const;

export interface AppSidebarProps {
  /** E-mail do usuário autenticado, exibido no rodapé da sidebar. */
  email?: string | null;
}

export function AppSidebar({ email }: AppSidebarProps) {
  const { state, isMobile } = useSidebar();
  const colapsada = state === "collapsed" && !isMobile;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const caminhoAtual = useRouterState({ select: (router) => router.location.pathname });

  async function sair() {
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    } catch (erro) {
      console.error(erro);
      toast.error("Não foi possível sair. Tente novamente.");
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Wallet className="size-4" />
          </span>
          {!colapsada && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">
                Controle Financeiro
              </p>
              <p className="truncate text-xs text-muted-foreground">Pessoal</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ITENS.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={caminhoAtual === item.url}
                    tooltip={item.titulo}
                  >
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icone className="size-4" />
                      <span>{item.titulo}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {email && !colapsada && (
            <SidebarMenuItem>
              <p
                className={cn("truncate px-2 pb-1 text-xs text-muted-foreground")}
                title={email}
              >
                {email}
              </p>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={sair} tooltip="Sair">
              <LogOut className="size-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
