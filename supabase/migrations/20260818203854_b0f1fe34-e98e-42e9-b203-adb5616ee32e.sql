
-- Tabela para controle de pagamentos por ocorrência (itens virtuais como fixas e parcelas)
CREATE TABLE IF NOT EXISTS public.pagamentos_ocorrencia (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    origem TEXT NOT NULL CHECK (origem IN ('fixa', 'parcela')),
    origem_id UUID NOT NULL,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    ano INTEGER NOT NULL,
    pago BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (user_id, origem, origem_id, mes, ano)
);

-- Habilitar RLS
ALTER TABLE public.pagamentos_ocorrencia ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagamentos_ocorrencia TO authenticated;
GRANT ALL ON public.pagamentos_ocorrencia TO service_role;

-- Políticas
CREATE POLICY "Usuários podem gerenciar seus próprios pagamentos por ocorrência"
ON public.pagamentos_ocorrencia
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX idx_pagamentos_ocorrencia_user_periodo ON public.pagamentos_ocorrencia(user_id, mes, ano);
