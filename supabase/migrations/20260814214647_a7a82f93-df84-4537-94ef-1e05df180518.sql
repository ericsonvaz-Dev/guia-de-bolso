-- Cleanup of leftover veterinary-clinic objects
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user();
DROP FUNCTION IF EXISTS public.is_admin(uuid);
DROP FUNCTION IF EXISTS public.perfil_atual();
DROP FUNCTION IF EXISTS public.pode_editar_prontuario(uuid);
DROP FUNCTION IF EXISTS public.set_atualizado_em();

CREATE TYPE public.tipo_movimento AS ENUM ('receita', 'despesa');
CREATE TYPE public.status_lancamento AS ENUM ('pago', 'pendente');
CREATE TYPE public.status_parcela AS ENUM ('ativo', 'quitado');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- categorias
CREATE TABLE public.categorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  tipo public.tipo_movimento NOT NULL,
  cor TEXT NOT NULL DEFAULT '#1F4E78',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, nome, tipo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO authenticated;
GRANT ALL ON public.categorias TO service_role;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categorias_own" ON public.categorias FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_categorias_user ON public.categorias (user_id);
CREATE TRIGGER trg_categorias_updated BEFORE UPDATE ON public.categorias
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- lancamentos
CREATE TABLE public.lancamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  tipo public.tipo_movimento NOT NULL,
  status public.status_lancamento NOT NULL DEFAULT 'pendente',
  ano INT NOT NULL,
  mes INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamentos TO authenticated;
GRANT ALL ON public.lancamentos TO service_role;
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lancamentos_own" ON public.lancamentos FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_lancamentos_user ON public.lancamentos (user_id);
CREATE INDEX idx_lancamentos_periodo ON public.lancamentos (user_id, ano, mes);
CREATE INDEX idx_lancamentos_categoria ON public.lancamentos (categoria_id);
CREATE TRIGGER trg_lancamentos_updated BEFORE UPDATE ON public.lancamentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- contas_fixas
CREATE TABLE public.contas_fixas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  dia INT NOT NULL CHECK (dia BETWEEN 1 AND 31),
  descricao TEXT NOT NULL,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_fixas TO authenticated;
GRANT ALL ON public.contas_fixas TO service_role;
ALTER TABLE public.contas_fixas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contas_fixas_own" ON public.contas_fixas FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_contas_fixas_user ON public.contas_fixas (user_id);
CREATE INDEX idx_contas_fixas_categoria ON public.contas_fixas (categoria_id);
CREATE TRIGGER trg_contas_fixas_updated BEFORE UPDATE ON public.contas_fixas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- parcelas
CREATE TABLE public.parcelas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  descricao TEXT NOT NULL,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  valor_parcela NUMERIC(14,2) NOT NULL DEFAULT 0,
  num_parcelas INT NOT NULL DEFAULT 1 CHECK (num_parcelas > 0),
  mes_inicio INT NOT NULL CHECK (mes_inicio BETWEEN 1 AND 12),
  ano_inicio INT NOT NULL,
  data_primeira_parcela DATE NOT NULL DEFAULT CURRENT_DATE,
  status public.status_parcela NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcelas TO authenticated;
GRANT ALL ON public.parcelas TO service_role;
ALTER TABLE public.parcelas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parcelas_own" ON public.parcelas FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_parcelas_user ON public.parcelas (user_id);
CREATE INDEX idx_parcelas_categoria ON public.parcelas (categoria_id);
CREATE TRIGGER trg_parcelas_updated BEFORE UPDATE ON public.parcelas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed on signup
CREATE OR REPLACE FUNCTION public.seed_novo_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_moradia UUID;
  v_transporte UUID;
  v_pensao UUID;
  v_educacao UUID;
BEGIN
  INSERT INTO public.categorias (user_id, nome, tipo, cor) VALUES
    (NEW.id, 'Moradia', 'despesa', '#C62828'),
    (NEW.id, 'Transporte', 'despesa', '#C62828'),
    (NEW.id, 'Pensão', 'despesa', '#C62828'),
    (NEW.id, 'Educação', 'despesa', '#C62828'),
    (NEW.id, 'Contas (água/luz/gás)', 'despesa', '#C62828'),
    (NEW.id, 'Mercado / Alimentação', 'despesa', '#C62828'),
    (NEW.id, 'Saúde / Farmácia', 'despesa', '#C62828'),
    (NEW.id, 'Lazer / Assinaturas', 'despesa', '#C62828'),
    (NEW.id, 'Vestuário', 'despesa', '#C62828'),
    (NEW.id, 'Cartão de crédito', 'despesa', '#C62828'),
    (NEW.id, 'Parcelas', 'despesa', '#6A1B9A'),
    (NEW.id, 'Investimentos / Poupança', 'despesa', '#1F4E78'),
    (NEW.id, 'Outros', 'despesa', '#C62828'),
    (NEW.id, 'Salário', 'receita', '#2E7D32'),
    (NEW.id, 'Freelance / Extra', 'receita', '#2E7D32'),
    (NEW.id, 'Rendimentos', 'receita', '#2E7D32'),
    (NEW.id, 'Reembolsos', 'receita', '#2E7D32'),
    (NEW.id, 'Outros', 'receita', '#2E7D32')
  ON CONFLICT (user_id, nome, tipo) DO NOTHING;

  SELECT id INTO v_moradia FROM public.categorias WHERE user_id = NEW.id AND nome = 'Moradia' AND tipo = 'despesa';
  SELECT id INTO v_transporte FROM public.categorias WHERE user_id = NEW.id AND nome = 'Transporte' AND tipo = 'despesa';
  SELECT id INTO v_pensao FROM public.categorias WHERE user_id = NEW.id AND nome = 'Pensão' AND tipo = 'despesa';
  SELECT id INTO v_educacao FROM public.categorias WHERE user_id = NEW.id AND nome = 'Educação' AND tipo = 'despesa';

  INSERT INTO public.contas_fixas (user_id, dia, descricao, categoria_id, valor) VALUES
    (NEW.id, 15, 'Aluguel', v_moradia, 1200.00),
    (NEW.id, 5, 'Carro', v_transporte, 1456.00),
    (NEW.id, 20, 'Pensão', v_pensao, 500.00),
    (NEW.id, 15, 'Escola Aurora', v_educacao, 385.00),
    (NEW.id, 20, 'Rhema', v_educacao, 289.00),
    (NEW.id, 20, 'Internet', v_moradia, 140.00),
    (NEW.id, 15, 'Internet Celular', v_moradia, 70.00);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_seed
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.seed_novo_usuario();