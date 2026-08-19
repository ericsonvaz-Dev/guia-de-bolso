# Revisões de Segurança

## Storage (Buckets)
- Buckets 'anexos-atendimentos' e 'fotos-pacientes' marcados como privados via API.
- Políticas de RLS de Storage via SQL aguardam inicialização completa do serviço de Storage no ambiente Cloud.

## Funções SQL
- Execução pública revogada para 'seed_novo_usuario' e 'fix_user_categories'.

## Frontend
- Corrigido Hydration Mismatch na tela de Auth para evitar erros de renderização.
