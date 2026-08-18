DELETE FROM public.lancamentos l
USING public.contas_fixas cf
WHERE l.user_id = cf.user_id
  AND l.descricao = cf.descricao
  AND l.valor = cf.valor
  AND cf.ativo = true
  AND l.tipo = 'despesa'
  AND (l.categoria_id = cf.categoria_id OR l.categoria_id IS NULL);