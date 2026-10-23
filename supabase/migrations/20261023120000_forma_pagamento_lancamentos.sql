-- Forma de pagamento dos lançamentos (crédito, débito, dinheiro/pix).
-- Mudança apenas aditiva: lançamentos antigos ficam com NULL ("não informado").
-- Compras parceladas no cartão continuam usando a tabela public.parcelas.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'forma_pagamento') THEN
    CREATE TYPE public.forma_pagamento AS ENUM ('credito', 'debito', 'dinheiro_pix');
  END IF;
END
$$;

ALTER TABLE public.lancamentos
  ADD COLUMN IF NOT EXISTS forma_pagamento public.forma_pagamento;
