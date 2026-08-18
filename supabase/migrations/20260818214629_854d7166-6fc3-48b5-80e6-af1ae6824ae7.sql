
-- 1. Criar Tabela de Perfis
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome_exibicao TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Políticas de RLS para Profiles
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
END $$;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. Atualizar Funções de Seed e Reparo (Removendo Contas Fixas)

-- public.seed_novo_usuario
CREATE OR REPLACE FUNCTION public.seed_novo_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir Categorias Padrão
  INSERT INTO public.categorias (user_id, nome, tipo, cor)
  VALUES
    (NEW.id, 'Moradia', 'despesa'::public.tipo_movimento, '#C62828'),
    (NEW.id, 'Contas da Casa', 'despesa'::public.tipo_movimento, '#C62828'),
    (NEW.id, 'Alimentação', 'despesa'::public.tipo_movimento, '#C62828'),
    (NEW.id, 'Transporte', 'despesa'::public.tipo_movimento, '#C62828'),
    (NEW.id, 'Saúde', 'despesa'::public.tipo_movimento, '#C62828'),
    (NEW.id, 'Compras', 'despesa'::public.tipo_movimento, '#C62828'),
    (NEW.id, 'Lazer', 'despesa'::public.tipo_movimento, '#C62828'),
    (NEW.id, 'Viagens', 'despesa'::public.tipo_movimento, '#C62828'),
    (NEW.id, 'Educação', 'despesa'::public.tipo_movimento, '#C62828'),
    (NEW.id, 'Investimentos / Poupança', 'despesa'::public.tipo_movimento, '#1F4E78'),
    (NEW.id, 'Outros', 'despesa'::public.tipo_movimento, '#C62828'),
    (NEW.id, 'Salário', 'receita'::public.tipo_movimento, '#2E7D32'),
    (NEW.id, 'Freelance / Extra', 'receita'::public.tipo_movimento, '#2E7D32'),
    (NEW.id, 'Rendimentos', 'receita'::public.tipo_movimento, '#2E7D32'),
    (NEW.id, 'Reembolsos', 'receita'::public.tipo_movimento, '#2E7D32'),
    (NEW.id, 'Outros', 'receita'::public.tipo_movimento, '#2E7D32')
  ON CONFLICT (user_id, nome, tipo) DO NOTHING;

  -- Inserir Profile em branco
  INSERT INTO public.profiles (id, nome_exibicao)
  VALUES (NEW.id, NULL)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- public.fix_user_categories
CREATE OR REPLACE FUNCTION public.fix_user_categories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- Inserir Categorias Padrão
  INSERT INTO public.categorias (user_id, nome, tipo, cor)
  VALUES
    (v_user_id, 'Moradia', 'despesa'::public.tipo_movimento, '#C62828'),
    (v_user_id, 'Contas da Casa', 'despesa'::public.tipo_movimento, '#C62828'),
    (v_user_id, 'Alimentação', 'despesa'::public.tipo_movimento, '#C62828'),
    (v_user_id, 'Transporte', 'despesa'::public.tipo_movimento, '#C62828'),
    (v_user_id, 'Saúde', 'despesa'::public.tipo_movimento, '#C62828'),
    (v_user_id, 'Compras', 'despesa'::public.tipo_movimento, '#C62828'),
    (v_user_id, 'Lazer', 'despesa'::public.tipo_movimento, '#C62828'),
    (v_user_id, 'Viagens', 'despesa'::public.tipo_movimento, '#C62828'),
    (v_user_id, 'Educação', 'despesa'::public.tipo_movimento, '#C62828'),
    (v_user_id, 'Investimentos / Poupança', 'despesa'::public.tipo_movimento, '#1F4E78'),
    (v_user_id, 'Outros', 'despesa'::public.tipo_movimento, '#C62828'),
    (v_user_id, 'Salário', 'receita'::public.tipo_movimento, '#2E7D32'),
    (v_user_id, 'Freelance / Extra', 'receita'::public.tipo_movimento, '#2E7D32'),
    (v_user_id, 'Rendimentos', 'receita'::public.tipo_movimento, '#2E7D32'),
    (v_user_id, 'Reembolsos', 'receita'::public.tipo_movimento, '#2E7D32'),
    (v_user_id, 'Outros', 'receita'::public.tipo_movimento, '#2E7D32')
  ON CONFLICT (user_id, nome, tipo) DO NOTHING;
  
  -- Garantir Profile
  INSERT INTO public.profiles (id, nome_exibicao)
  VALUES (v_user_id, NULL)
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- 3. Backfill de Perfis Faltantes
INSERT INTO public.profiles (id, nome_exibicao)
SELECT id, NULL FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 4. Isolamento Total via RLS (Garantir auth.uid() = user_id)
-- Remover quaisquer políticas de bypass e recriar as de usuário em todas as tabelas de dados.

-- Categorias
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias categorias" ON public.categorias;
DROP POLICY IF EXISTS "Usuários podem inserir suas próprias categorias" ON public.categorias;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias categorias" ON public.categorias;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias categorias" ON public.categorias;
CREATE POLICY "Categorias isoladas por usuário" ON public.categorias FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Lancamentos
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios lançamentos" ON public.lancamentos;
DROP POLICY IF EXISTS "Usuários podem inserir seus próprios lançamentos" ON public.lancamentos;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios lançamentos" ON public.lancamentos;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios lançamentos" ON public.lancamentos;
CREATE POLICY "Lançamentos isolados por usuário" ON public.lancamentos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Contas Fixas
ALTER TABLE public.contas_fixas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias contas fixas" ON public.contas_fixas;
DROP POLICY IF EXISTS "Usuários podem inserir suas próprias contas fixas" ON public.contas_fixas;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias contas fixas" ON public.contas_fixas;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias contas fixas" ON public.contas_fixas;
CREATE POLICY "Contas fixas isoladas por usuário" ON public.contas_fixas FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Parcelas
ALTER TABLE public.parcelas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias parcelas" ON public.parcelas;
DROP POLICY IF EXISTS "Usuários podem inserir suas próprias parcelas" ON public.parcelas;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias parcelas" ON public.parcelas;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias parcelas" ON public.parcelas;
CREATE POLICY "Parcelas isoladas por usuário" ON public.parcelas FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Pagamentos Ocorrência
ALTER TABLE public.pagamentos_ocorrencia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários podem gerenciar seus próprios pagamentos por ocorrência" ON public.pagamentos_ocorrencia;
CREATE POLICY "Pagamentos ocorrência isolados por usuário" ON public.pagamentos_ocorrencia FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
