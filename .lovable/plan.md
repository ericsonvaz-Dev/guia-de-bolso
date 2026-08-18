# Plano de Correções - Dashboard e Estabilidade Financeira

Este plano detalha as correções críticas de runtime, tipagem e lógica financeira para restaurar o funcionamento do Dashboard e garantir a integridade dos dados.

## Alterações Técnicas

### 1. Robustez em `src/lib/financas.ts`
- **Normalização Segura:** Implementar proteção contra strings nulas/undefined ao usar `.toLowerCase()` em descrições de lançamentos e contas fixas.
- **Valores Numéricos:** Substituir `Number()` por `paraNumero()` de `src/lib/formatadores.ts` em todos os cálculos de valor (receitas, despesas, parcelas) para evitar `NaN`.
- **Tratamento de Dados Incompletos:** Adicionar guardas para garantir que a falta de `categoria_id` ou outros campos não interrompa o processamento.

### 2. Tipagem RPC em `src/integrations/supabase/types.ts`
- **Correção de `Args: never`:** Atualizar a definição da função `fix_user_categories` para aceitar um objeto vazio `{ Args: Record<string, never>; Returns: undefined }`. Isso eliminará erros de compilação do TypeScript nos 4 arquivos que utilizam esta chamada.

### 3. Refatoração do Dashboard (`src/routes/_authenticated/dashboard.tsx`)
- **Fonte Única de Dados:** Substituir a `useQuery` inline pelo hook `useDadosFinanceiros(mes, ano)`, unificando a lógica com a tela Mês.
- **Tratamento de Estados:** Adicionar UI de erro amigável com botão de "Tentar novamente" e garantir que cards exibam "R$ 0,00" em vez de quebrar quando os dados forem indefinidos.
- **RPC Call:** Atualizar a chamada para `supabase.rpc("fix_user_categories", {})` para compatibilidade total.

### 4. Lógica de Pendências e % Gasto
- **Cálculo de Pagos/Pendentes:** Corrigir `processarResumoFinanceiro` para incluir **apenas despesas** no cálculo de `pagas` e `pendentes`. Receitas não devem influenciar esses totais específicos.
- **KPI % Gasto:** Implementar tratamento para receita zero (exibir "—" ou "0%") e teto visual de "100%+" para valores que excedam o limite.

## Validação
- Verificação de build sem erros de tipo.
- Teste de renderização com banco de dados vazio.
- Validação visual dos cálculos de saldo e pendências no Dashboard.
