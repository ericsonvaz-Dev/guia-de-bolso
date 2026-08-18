# Plano de Implementação: Perfil, RLS e Ajustes de Seed

Este plano descreve a remoção de contas fixas do seed automático, a implementação de perfis de usuário com edição (nome, email, senha), e o reforço do isolamento de dados via RLS.

## 1. Banco de Dados (Supabase)

Criar uma migração (`20260818214325_user_profile_and_rls_fix.sql`) contendo:

### Tabela de Perfis
- Criar `public.profiles` (id references auth.users, nome_exibicao, updated_at).
- Habilitar RLS e criar políticas de isolamento por usuário (`auth.uid() = id`).
- Grant para `authenticated` e `service_role`.

### Ajuste de Seed e Funções de Reparo
- `CREATE OR REPLACE FUNCTION public.seed_novo_usuario()`:
    - Remover inserção de `contas_fixas`.
    - Adicionar inserção de linha em `profiles`.
    - Manter apenas categorias padrão.
- `CREATE OR REPLACE FUNCTION public.fix_user_categories()`:
    - Remover inserção de `contas_fixas` e variáveis de ID auxiliares.
    - Manter apenas categorias padrão.

### Backfill e Reforço de RLS
- Inserir perfis faltantes para usuários existentes.
- Garantir RLS estrito (`auth.uid() = user_id`) em: `categorias`, `lancamentos`, `contas_fixas`, `parcelas`, `pagamentos_ocorrencia`.
- Remover qualquer bypass de admin (ex: `is_admin`) se existir.

## 2. Interface do Usuário (Frontend)

### Dashboard (`src/routes/_authenticated/dashboard.tsx`)
- Adicionar hook `useQuery` para buscar o perfil do usuário logado.
- Exibir saudação personalizada: "Olá, {nome}" ou fallback "Dashboard {ano}".
- Adicionar ícone de edição (lápis) ao lado da saudação.
- Implementar `Dialog` de Configurações do Perfil:
    - Campo "Nome de Exibição" com `useMutation` para atualizar `profiles`.
    - Seção de "Segurança" com campos para E-mail e Senha usando `supabase.auth.updateUser`.
    - Feedback visual com `sonner` (toast) e invalidação de queries.

### Proteção de Dados
- Revisar `src/lib/financas.ts` para garantir que nenhuma rotina automática apague lançamentos manuais legítimos.

## Detalhes Técnicos
- **Migração:** SQL puro via `supabase--migration`.
- **UI:** shadcn/ui (`Dialog`, `Input`, `Label`, `Button`, `Skeleton`).
- **Icons:** `lucide-react` (`User`, `Settings`, `Lock`, `Mail`, `Pencil`).
- **RLS:** A regra padrão será `USING (auth.uid() = user_id)` para dados e `auth.uid() = id` para perfis.
