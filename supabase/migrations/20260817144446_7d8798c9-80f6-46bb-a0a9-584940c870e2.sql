CREATE OR REPLACE FUNCTION public.fix_user_categories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_moradia UUID;
  v_transporte UUID;
  v_educacao UUID;
BEGIN
  -- 1. Inserir Categorias
  INSERT INTO public.categorias (user_id, nome, tipo, cor)
  SELECT v_user_id, 'Moradia', 'despesa', '#C62828' UNION ALL
  SELECT v_user_id, 'Contas da Casa', 'despesa', '#C62828' UNION ALL
  SELECT v_user_id, 'Alimentação', 'despesa', '#C62828' UNION ALL
  SELECT v_user_id, 'Transporte', 'despesa', '#C62828' UNION ALL
  SELECT v_user_id, 'Saúde', 'despesa', '#C62828' UNION ALL
  SELECT v_user_id, 'Compras', 'despesa', '#C62828' UNION ALL
  SELECT v_user_id, 'Lazer', 'despesa', '#C62828' UNION ALL
  SELECT v_user_id, 'Viagens', 'despesa', '#C62828' UNION ALL
  SELECT v_user_id, 'Educação', 'despesa', '#C62828' UNION ALL
  SELECT v_user_id, 'Investimentos / Poupança', 'despesa', '#1F4E78' UNION ALL
  SELECT v_user_id, 'Outros', 'despesa', '#C62828' UNION ALL
  SELECT v_user_id, 'Salário', 'receita', '#2E7D32' UNION ALL
  SELECT v_user_id, 'Freelance / Extra', 'receita', '#2E7D32' UNION ALL
  SELECT v_user_id, 'Rendimentos', 'receita', '#2E7D32' UNION ALL
  SELECT v_user_id, 'Reembolsos', 'receita', '#2E7D32' UNION ALL
  SELECT v_user_id, 'Outros', 'receita', '#2E7D32'
  ON CONFLICT (user_id, nome, tipo) DO NOTHING;

  -- 2. Recuperar IDs das categorias para as contas fixas
  SELECT id INTO v_moradia FROM public.categorias WHERE user_id = v_user_id AND nome = 'Moradia' AND tipo = 'despesa' LIMIT 1;
  SELECT id INTO v_transporte FROM public.categorias WHERE user_id = v_user_id AND nome = 'Transporte' AND tipo = 'despesa' LIMIT 1;
  SELECT id INTO v_educacao FROM public.categorias WHERE user_id = v_user_id AND nome = 'Educação' AND tipo = 'despesa' LIMIT 1;

  -- 3. Inserir Contas Fixas
  INSERT INTO public.contas_fixas (user_id, dia, descricao, categoria_id, valor) VALUES
    (v_user_id, 15, 'Aluguel', v_moradia, 1200.00),
    (v_user_id, 5, 'Carro', v_transporte, 1456.00),
    (v_user_id, 15, 'Escola Aurora', v_educacao, 385.00),
    (v_user_id, 20, 'Rhema', v_educacao, 289.00),
    (v_user_id, 20, 'Internet', v_moradia, 140.00),
    (v_user_id, 15, 'Internet Celular', v_moradia, 70.00)
  ON CONFLICT DO NOTHING;
END;
$$;