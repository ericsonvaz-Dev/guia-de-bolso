# Plano de Implementação: Tela de Parcelas (CRUD)

Implementação da gestão de compras parceladas com lógica de incidência automática e visualização de projeção futura.

## 🏗️ UI Architect

- Criar a interface de CRUD para a tabela `parcelas`.
- Tabela principal com as colunas: Descrição, Categoria, Valor da Parcela, Nº Parcelas, Mês/Ano Início, 1ª Parcela, Total e Status.
- Botão "Nova Parcela" que abre um diálogo lateral (Sheet) ou modal (Dialog).
- **Preview de Projeção:** Ao preencher os dados da parcela, exibir uma lista ou grid dos meses/anos onde a parcela será lançada, validando a lógica de "índice absoluto".
- Estilização com a cor de acento roxo `#6A1B9A`.

## 🗄️ Supabase Engineer

- Operações de `SELECT`, `INSERT`, `UPDATE` e `DELETE` na tabela `parcelas`.
- Garantir que as categorias sejam carregadas corretamente (apenas do tipo 'despesa').
- Validação de RLS (já configurado, mas garantir que o `user_id` seja injetado corretamente).

## 🔍 Code Auditor

- Validar a lógica de cálculo do `fimAbs` para garantir que o preview coincida com o que o hook `useDadosFinanceiros` processa.
- Garantir formatação consistente de moeda (BRL) e datas.

## 📈 SEO Optimizer

- Configurar metadados específicos para a rota `/parcelas`.

## Detalhes Técnicos

- Utilizar `react-hook-form` + `zod` para o formulário.
- Componentes Shadcn: `Table`, `Dialog`, `Input`, `Select`, `Button`.
- Lógica de índice absoluto: `abs = ano * 12 + (mes - 1)`.
- Atualização em tempo real do cache via `queryClient.invalidateQueries`.

```text
| Descrição | Categoria | Valor | Parcelas | Início | Total | Status | Ações |
|-----------|-----------|-------|----------|--------|-------|--------|-------|
| iPhone 15 | Lazer     | 500   | 10       | 01/2026| 5.000 | Ativo  | [Edit]|
```
