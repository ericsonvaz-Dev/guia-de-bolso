import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { processarResumoFinanceiro, ResumoFinanceiro } from "@/lib/financas";

export function useDadosFinanceiros(mes: number, ano: number) {
  return useQuery({
    queryKey: ["dados-financeiros", ano, mes],
    queryFn: async (): Promise<ResumoFinanceiro> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Buscar todos os dados necessários em paralelo
      const [
        { data: lancamentos },
        { data: contasFixas },
        { data: parcelas },
        { data: pagamentosOcorrencia },
        { data: categorias }
      ] = await Promise.all([
        supabase
          .from("lancamentos")
          .select("*")
          .eq("mes", mes)
          .eq("ano", ano),
        supabase
          .from("contas_fixas")
          .select("*")
          .eq("ativo", true),
        supabase
          .from("parcelas")
          .select("*")
          .eq("status", "ativo"),
        supabase
          .from("pagamentos_ocorrencia")
          .select("*")
          .eq("mes", mes)
          .eq("ano", ano),
        supabase
          .from("categorias")
          .select("*")
      ]);

      return processarResumoFinanceiro(
        lancamentos || [],
        contasFixas || [],
        parcelas || [],
        pagamentosOcorrencia || [],
        categorias || [],
        mes,
        ano
      );
    },
  });
}
