# Plano de Correção: Erro de Criação de Categoria

Este plano visa corrigir o erro na criação de categorias padrão para usuários existentes, garantindo que as tabelas `categorias` e `contas_fixas` sejam populadas corretamente quando o reparo é solicitado.

## Análise do Problema
O erro relatado pelo usuário ("corrija o erro de criação de categoria") provavelmente refere-se à funcionalidade de "restaurar categorias padrão" que foi implementada anteriormente. 
A análise da migração `20260817125750_ae664a78-a7b9-40ee-8181-ff62122477e9.sql` revelou que a função RPC `fix_user_categories()` insere apenas as categorias, mas não as contas fixas iniciais para usuários existentes, ao contrário da trigger `seed_novo_usuario()`. Além disso, se o usuário já tiver categorias com nomes diferentes, a interface pode ficar confusa.

## Ações Propostas

### 1. Banco de Dados (Supabase)
* Atualizar a função RPC `fix_user_categories()` para também criar as contas fixas padrão se elas não existirem, mantendo a paridade com a trigger de novos usuários.
* Garantir que as cores e tipos estejam corretos.

### 2. Frontend (UI/UX)
* Remover os avisos de "Dica" estáticos que poluem a UI agora que temos o reparo automático.
* Melhorar o feedback visual durante a criação das categorias.

## Detalhes Técnicos
* **Migração SQL:**
  * Atualizar `fix_user_categories` para incluir o bloco de `INSERT INTO public.contas_fixas` usando `v_moradia`, `v_transporte` e `v_educacao`.
* **Componentes React:**
  * Em `src/routes/_authenticated/contas-fixas.tsx`, remover o bloco de "Dica" no final do arquivo (linhas 481-490 aproximadamente).
  * Validar se o `invalidateQueries` está limpando o cache corretamente para refletir as novas categorias imediatamente.

## Verificação
* Testar o botão "Clique aqui para criar as categorias padrão" em uma conta sem categorias.
* Verificar se as contas fixas (Aluguel, Carro, etc.) aparecem automaticamente após o reparo.
