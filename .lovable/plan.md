# Plano de Implementação: Camada de Lógica Financeira

Este plano detalha a criação da lógica financeira central (hooks e utilitários) para o sistema de controle de gastos pessoais.

## 1. Funções Utilitárias (`src/lib/financas.ts`)

Criar funções puras para o processamento de regras de negócio:

- `calcularParcelaIncidente(parcela, mes, ano)`: Implementa a lógica do índice absoluto (`ano * 12 + mes`) para determinar se uma parcela deve aparecer no mês solicitado.
- `processarResumoFinanceiro(dados)`: Recebe lançamentos, contas fixas e parcelas e retorna os totais (Receitas, Despesas Manuais, Fixas, Parcelas, Saldo, % Gasto, Pagas/Pendentes e Gastos por Categoria).

## 2. Hook de Dados Financeiros (`src/hooks/use-dados-financeiros.ts`)

Implementar um hook usando TanStack Query para buscar e processar os dados de um mês específico:

- **Input**: `ano`, `mes`.
- **Processamento**:
  - Busca `lancamentos` do mês.
  - Busca `contas_fixas` ativas.
  - Busca `parcelas` ativas.
  - Mescla `contas_fixas` ativas como lançamentos pendentes virtuais para o mês (respeitando o campo `dia`).
  - Calcula a incidência de `parcelas` para o mês.
- **Output**: Objeto consolidado com o resumo financeiro solicitado.

## 3. Persistência de Status de Contas Fixas

Para as contas fixas automáticas que podem ser marcadas como "Pagas" individualmente por mês:
- Quando o usuário marcar uma conta fixa como "Paga" em um mês específico, criaremos um registro real na tabela `lancamentos` com a `descricao` e `valor` da conta fixa, vinculando-a à `categoria_id` original, com status `pago`.
- A lógica do hook irá priorizar registros reais em `lancamentos` que correspondam a descrições de contas fixas para evitar duplicidade.

## Detalhes Técnicos

- **Tecnologia**: TypeScript, TanStack Query, Supabase Client.
- **Validação**: Tipagem rigorosa usando os tipos gerados pelo Supabase.
- **Performance**: Cache via TanStack Query com invalidação baseada em `[ano, mes]`.

---

### 📊 Relatório de Execução (Antecipado)

**Padrão utilizado:** Business Logic Separation

**Sub-agentes ativados:**
- 🎨 **UI Architect** — ➖ Não necessário (apenas lógica por enquanto)
- 🗄️ **Supabase Engineer** — ✅ Executado (integração com tabelas)
- 🔍 **Code Auditor** — ✅ Executado (validação de tipos e lógica)
- 🧪 **Testing Agent** — ➖ Não necessário
- 📈 **SEO Optimizer** — ➖ Não necessário
- 🚀 **Deploy Ops** — ➖ Não necessário
- 🔌 **API Integrator** — ➖ Não necessário
