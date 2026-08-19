CREATE OR REPLACE FUNCTION public.seed_novo_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

  INSERT INTO public.profiles (id, nome_exibicao)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'nome_exibicao', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET nome_exibicao = EXCLUDED.nome_exibicao;

  RETURN NEW;
END;
$$;

# Recriar o trigger caso não exista ou tenha sido removido
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.seed_novo_usuario();
    END IF;
END $$;
