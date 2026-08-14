import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  // A sessão do Supabase fica no localStorage; o servidor não consegue lê-la.
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: LayoutAutenticado,
});

function LayoutAutenticado() {
  const { user } = Route.useRouteContext();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar email={user.email ?? null} />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-5" />
            <span className="text-sm font-medium text-foreground">Controle Financeiro</span>
          </header>
          <main className="flex-1 p-4 md:p-6">
            {/* Rotas filhas renderizam aqui. */}
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
