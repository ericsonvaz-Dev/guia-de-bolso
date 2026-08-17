CREATE OR REPLACE FUNCTION public.seed_novo_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_moradia UUID;
  v_transporte UUID;
  v_educacao UUID;
BEGIN
  INSERT INTO public.categorias (user_id, nome, tipo, cor) VALUES
    (NEW.id, 'Moradia', 'despesa', '#C62828'),
    (NEW.id, 'Contas da Casa', 'despesa', '#C62828'),
    (NEW.id, 'Alimentação', 'despesa', '#C62828'),
    (NEW.id, 'Transporte', 'despesa', '#C62828'),
    (NEW.id, 'Saúde', 'despesa', '#C62828'),
    (NEW.id, 'Compras', 'despesa', '#C62828'),
    (NEW.id, 'Lazer', 'despesa', '#C62828'),
    (NEW.id, 'Viagens', 'despesa', '#C62828'),
    (NEW.id, 'Educação', 'despesa', '#C62828'),
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
  SELECT id INTO v_educacao FROM public.categorias WHERE user_id = NEW.id AND nome = 'Educação' AND tipo = 'despesa';

  INSERT INTO public.contas_fixas (user_id, dia, descricao, categoria_id, valor) VALUES
    (NEW.id, 15, 'Aluguel', v_moradia, 1200.00),
    (NEW.id, 5, 'Carro', v_transporte, 1456.00),
    (NEW.id, 15, 'Escola Aurora', v_educacao, 385.00),
    (NEW.id, 20, 'Rhema', v_educacao, 289.00),
    (NEW.id, 20, 'Internet', v_moradia, 140.00),
    (NEW.id, 15, 'Internet Celular', v_moradia, 70.00);

  RETURN NEW;
END;
$$;