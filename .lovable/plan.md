# Plano de Melhorias Financeiras e UI

Substituição da lógica de status de pagamento, padronização de cores e ajustes de responsividade mobile-first.

## 1. Banco de Dados e Lógica Financeira
- **Nova Tabela**: Criar `pagamentos_ocorrencia` para persistir o status "pago" de contas fixas e parcelas por mês/ano.
- **Isolamento**: RLS configurado para `user_id = auth.uid()`.
- **Refatoração do Motor**: Atualizar `src/lib/financas.ts` para usar a nova tabela em vez de casar por descrição. Itens virtuais serão "pagos" se houver registro correspondente no período.
- **Hook de Dados**: Atualizar `use-dados-financeiros.ts` para buscar os registros de ocorrência.

## 2. Interface (UI) e Gráficos
- **Status em Itens Virtuais**: Na aba Mês, o clique no status de uma conta fixa ou parcela fará um upsert/delete na tabela `pagamentos_ocorrencia`.
- **Cores de Categorias**: Extrair a paleta de 15 cores contrastantes para `src/lib/cores-categorias.ts` e aplicá-la por índice nos gráficos da aba Mês e Dashboard.

## 3. Responsividade Mobile-First
- **Aba Mês**: Layout de 1 coluna em mobile/tablet, 4 colunas em desktop.
- **Tabelas**: Rolagem horizontal forçada em telas pequenas (`overflow-x-auto` + `min-w`).
- **Navegação**: Cabeçalho de mês flexível (coluna no mobile, linha no tablet+).
- **Dashboard**: KPIs em grid responsivo (1 -> 2 -> 4 colunas).

## Detalhes Técnicos
- **SQL**: Migração para a tabela `pagamentos_ocorrencia` com índice único em `(user_id, origem, origem_id, mes, ano)`.
- **TanStack Query**: Invalidação correta de cache ao alternar status.
- **TypeScript**: Garantir que as novas propriedades de ocorrência sejam devidamente tipadas.
