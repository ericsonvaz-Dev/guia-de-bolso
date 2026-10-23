-- Controle de investimentos: cada linha é um aporte ou um resgate.
-- Totalmente separado de lancamentos: não altera saldo, despesas nem análise.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_movimento_investimento') THEN
    CREATE TYPE public.tipo_movimento_investimento AS ENUM ('aporte', 'resgate');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_ativo') THEN
    CREATE TYPE public.tipo_ativo AS ENUM (
      'renda_fixa', 'tesouro', 'acoes', 'fiis', 'fundos', 'cripto', 'previdencia', 'outros'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.investimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  movimento public.tipo_movimento_investimento NOT NULL DEFAULT 'aporte',
  nome TEXT NOT NULL,
  tipo_ativo public.tipo_ativo NOT NULL DEFAULT 'outros',
  instituicao TEXT NOT NULL,
  valor NUMERIC(14,2) NOT NULL CHECK (valor > 0),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investimentos TO authenticated;
GRANT ALL ON public.investimentos TO service_role;
ALTER TABLE public.investimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "investimentos_own" ON public.investimentos FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_investimentos_user ON public.investimentos (user_id);
CREATE INDEX IF NOT EXISTS idx_investimentos_data ON public.investimentos (user_id, data);
CREATE TRIGGER trg_investimentos_updated BEFORE UPDATE ON public.investimentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
