-- Revogar permissões de execução para as funções de seed e reparo
REVOKE EXECUTE ON FUNCTION public.seed_novo_usuario() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_novo_usuario() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_novo_usuario() FROM anon;

REVOKE EXECUTE ON FUNCTION public.fix_user_categories() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fix_user_categories() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fix_user_categories() FROM anon;

-- Garantir acesso apenas ao service_role (usado pelos triggers/Edge Functions) e postgres
GRANT EXECUTE ON FUNCTION public.seed_novo_usuario() TO service_role;
GRANT EXECUTE ON FUNCTION public.seed_novo_usuario() TO postgres;

GRANT EXECUTE ON FUNCTION public.fix_user_categories() TO service_role;
GRANT EXECUTE ON FUNCTION public.fix_user_categories() TO postgres;