---
name: Sincronização de Totais e Status
description: Refatora o cálculo financeiro para garantir que Total Despesas = Pagas + Pendentes em todas as telas, eliminando duplicidade e divergências.
type: feature
---

# Plano de Sincronização Financeira

Este plano refatora o motor de processamento financeiro para garantir consistência total entre Dashboard e Aba Mês.

## Alterações Técnicas

### 1. Núcleo Financeiro (`src/lib/financas.ts`)
- **Refatoração de `processarResumoFinanceiro`**:
  - Implementação de uma única passada (loop) sobre a lista `lancamentosCompletos`.
  - Remoção definitiva da dedup por descrição (`Set`).
  - Cálculo de `totalDespesas`, `pagas` e `pendentes` derivado da mesma iteração.
  - O status (pago/pendente) para itens virtuais (fixas/parcelas) será consultado de forma centralizada em `pagamentos_ocorrencia`.
  - Garantia de que `totalDespesas === pagas + pendentes` por construção.

### 2. Dashboard (`src/routes/_authenticated/dashboard.tsx`)
- Garantia de que o gráfico "Resumo por Status" e a tabela "Lançamentos do Mês" consomem diretamente as propriedades `pagas` e `pendentes` do hook `useDadosFinanceiros`.
- Remoção de qualquer lógica de filtragem ou cálculo local de status na UI.

### 3. Validação
- Verificação de centavos em meses com grande volume de dados.
- Teste de transição: marcar uma parcela como paga deve atualizar o Dashboard instantaneamente via invalidação de cache.

## Impacto na UI
- O gráfico de pizza ("Distribuição de Gastos") passará a bater 100% com o Total de Despesas exibido nos KPIs.
- O gráfico de barras ("Resumo por Status") refletirá exatamente a soma das despesas (Pagas + Pendentes).
