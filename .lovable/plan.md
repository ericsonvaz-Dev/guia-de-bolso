# Plano de Ação: Correção do Botão "Nova Receita" e "Nova Despesa"

Corrigir a falha de funcionamento nos botões de adição de lançamentos manuais na aba "Mês", implementando os diálogos de criação necessários.

## Alterações

### Componentes de UI
- Implementar diálogos de formulário para Receitas e Despesas na tela `src/routes/_authenticated/mes.tsx`.
- Criar esquemas de validação Zod para os lançamentos.
- Integrar com `useMutation` para persistência no Supabase.

### Lógica
- Assegurar que novos lançamentos invalidem o cache do TanStack Query para atualização instantânea dos totais do mês.
- Garantir que a data padrão do lançamento seja baseada no mês visualizado.

## Detalhes Técnicos
- Utilizar `Dialog` e `Form` do shadcn/ui.
- Realizar casting explícito do `tipo` ('receita' ou 'despesa') para o enum `tipo_movimento` do banco de dados.
- Mapear corretamente o `user_id` e `categoria_id`.
