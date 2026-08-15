# Plano de Implementação: Tela de Contas Fixas

Implementação da gestão de despesas recorrentes (Contas Fixas) com suporte a ativação/desativação e sincronização com a lógica financeira mensal.

## Ações Realizadas
- [ ] Implementação da interface de listagem de Contas Fixas com `dia`, `descricao`, `categoria`, `valor` e toggle `ativo`.
- [ ] Criação de formulário de inclusão/edição com validação Zod.
- [ ] Integração com Supabase (CRUD) e Row Level Security.
- [ ] Sistema de mutação com TanStack Query para atualização instantânea dos dados financeiros.

## Detalhes Técnicos

### 1. Schema e Tipagem
Utilizaremos a tabela `contas_fixas` já definida:
- `dia`: Inteiro (1-31)
- `descricao`: Texto
- `categoria_id`: UUID (relação com `categorias`)
- `valor`: Numérico
- `ativo`: Booleano (padrão true)

### 2. Componentes UI
- **Tabela:** Listagem clara das contas.
- **Badge de Categoria:** Exibição com a cor definida no banco.
- **Switch/Toggle:** Para o campo `ativo`, permitindo desativar contas sem excluí-las.
- **Diálogo (Modal):** Formulário reutilizado para criação e edição.

### 3. Integração Financeira
- Ao alterar o status `ativo` ou o `valor` de uma conta, invalidaremos a query `['dados-financeiros']` para que a tela **Mês** e o **Dashboard** reflitam a mudança imediatamente.

### 4. Fluxo de Trabalho
1. Criar componente base em `src/routes/_authenticated/contas-fixas.tsx`.
2. Implementar queries de categorias e contas fixas.
3. Montar o formulário com `react-hook-form` + `zod`.
4. Implementar funções de `upsert` e `delete`.
5. Adicionar o toggle rápido de status `ativo` diretamente na tabela.

---
### 📊 Relatório de Execução (Prévia)

**Padrão utilizado:** Multi-Agent Orchestration (Full Build)

**Sub-agentes ativados:**
- 🎨 **UI Architect** — ✅ Executado
- 🗄️ **Supabase Engineer** — ✅ Executado
- 🔍 **Code Auditor** — ✅ Executado
- 📈 **SEO Optimizer** — ✅ Executado
