-- Revogar acesso público e de usuários autenticados à função de seed
REVOKE EXECUTE ON FUNCTION public.seed_novo_usuario() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_novo_usuario() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_novo_usuario() FROM anon;

-- Garantir que apenas o service_role e o postgres possam executar
GRANT EXECUTE ON FUNCTION public.seed_novo_usuario() TO service_role;
GRANT EXECUTE ON FUNCTION public.seed_novo_usuario() TO postgres;