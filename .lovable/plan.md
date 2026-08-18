# Plano de Correção e Melhorias - Aba Mês

Este plano aborda a correção da duplicação de contas fixas e a implementação da funcionalidade de exclusão de lançamentos na aba Mês.

## Problemas Identificados

1.  **Clonagem de Contas Fixas:** Ao marcar uma conta fixa como "paga", o sistema cria um lançamento real na tabela `lancamentos`. Devido a falhas no processo de deduplicação por descrição, a conta fixa virtual reaparece, gerando duplicatas.
2.  **Falta de Exclusão:** Não existe interface para excluir receitas ou despesas reais na aba Mês.

## Soluções Propostas

### 1. Sistema de Pagamentos por Ocorrência
*   **Ajuste na Lógica de Status:** Alterar `alternarStatus` em `mes.tsx` para usar exclusivamente a tabela `pagamentos_ocorrencia` para itens virtuais (fixas e parcelas), em vez de criar lançamentos reais.
*   **Limpeza de Lógica Antiga:** Remover a deduplicação baseada em descrição no arquivo `financas.ts`. Agora, o status será determinado unicamente pelo vínculo com `pagamentos_ocorrencia`.
*   **Remoção de Duplicatas:** Criar uma rotina (limpeza via SQL/Script) para remover lançamentos reais que foram criados indevidamente como "clones" de contas fixas.

### 2. Funcionalidade de Exclusão
*   **Nova Coluna de Ações:** Adicionar uma coluna nas tabelas de Receita e Despesa com um ícone de lixeira (Lucide `Trash2`).
*   **Restrição para Itens Virtuais:** O botão de exclusão será exibido apenas para lançamentos reais (`virtual !== true`). Para itens virtuais, o ícone será omitido ou desabilitado.
*   **Confirmação de Segurança:** Implementar um `AlertDialog` de confirmação antes de proceder com a exclusão definitiva no banco de dados.

## Detalhes Técnicos

### Frontend (`src/routes/_authenticated/mes.tsx`)
*   Implementar `mutacaoExcluir` usando `useMutation`.
*   Adicionar `AlertDialog` para confirmação.
*   Atualizar tabelas para incluir a coluna "Ações".
*   Refinar `alternarStatus` para garantir que apenas `pagamentos_ocorrencia` seja afetado para itens virtuais.

### Lógica (`src/lib/financas.ts`)
*   Simplificar a montagem da lista `lancamentosCompletos`.
*   Garantir que contas fixas/parcelas virtuais sempre apareçam, com o status refletindo o banco de dados.

### Banco de Dados (Supabase)
*   Executar migração de limpeza para remover lançamentos duplicados (identificados por descrição e valor que batem com contas fixas do usuário).

## Validação
*   Verificar se clicar em "Pago" em uma conta fixa NÃO cria um novo item na lista.
*   Confirmar se a exclusão de um lançamento manual remove o item corretamente após a confirmação.
*   Testar responsividade em dispositivos móveis.
