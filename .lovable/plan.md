# Controle Financeiro Pessoal — base do app

App em pt-BR, valores em R$ e datas em DD/MM/AAAA. Esta etapa entrega banco de dados, autenticação, design system e navegação — sem as telas internas.

## Ponto importante encontrado

O banco conectado está **vazio** (nenhuma tabela), mas ainda existe um gatilho de cadastro herdado de um projeto anterior de clínica veterinária que tenta gravar numa tabela `usuarios` inexistente. Do jeito que está, **qualquer cadastro de novo usuário falharia**. A migração vai remover esse gatilho e as funções órfãs (`handle_new_auth_user`, `is_admin`, `perfil_atual`, `pode_editar_prontuario`) e instalar o gatilho correto do app financeiro.

## Banco de dados

Tabelas: `categorias`, `lancamentos`, `contas_fixas`, `parcelas` — todas com `user_id`, `created_at`/`updated_at` e os campos pedidos. Tipos e status controlados por enums; `lancamentos` e `contas_fixas`/`parcelas` referenciam `categorias`.

Acesso: RLS ativa em todas. Cada pessoa vê, cria, edita e apaga **apenas** os próprios registros. Nenhum acesso anônimo.

Seed automático no cadastro: um gatilho cria as 13 categorias de despesa e 5 de receita (com as cores do design system) e, em seguida, as 7 contas fixas (Aluguel 1200, Carro 1456, Pensão 500, Escola Aurora 385, Rhema 289, Internet 140, Internet Celular 70), já ligadas às categorias corretas.

## Design system

Tokens em `src/styles.css` (oklch, claro + escuro), usados em todo o app:

| Token | Uso | Cor |
|---|---|---|
| `negativo` | déficit | #C62828 |
| `saldo` | saldo positivo | #1F4E78 |
| `receita` | entrada | #2E7D32 |
| `pendente` / `pendente-bg` | status pendente | #F9A825 / #FFF3CD |
| `pago` / `pago-bg` | status pago | #2E7D32 / #C6EFCE |
| `parcela` | acento de parcelas | #6A1B9A |

Mais um componente `<StatusBadge>` e helpers `formatarBRL` / `formatarData` (Intl pt-BR) para uso consistente.

## Telas e navegação

- `/auth` — login e cadastro com e-mail/senha, mensagens em pt-BR, redireciona para o Dashboard.
- Área protegida com sidebar: **Dashboard**, **Mês**, **Contas Fixas**, **Parcelas** (ícones lucide), colapsável, mobile-first (drawer no celular), com nome do usuário e sair.
- As quatro páginas ficam como placeholders ("em construção") — nenhuma lógica interna nesta etapa.

## Detalhes técnicos

- Enums Postgres para `tipo`, `status_lancamento`, `status_parcela`; `mes` e `dia` com CHECK de faixa; índices em `user_id`, `(ano, mes)` e `categoria_id`.
- Gatilho `AFTER INSERT ON auth.users` (SECURITY DEFINER, `search_path = public`) faz o seed; GRANTs para `authenticated` e `service_role` em cada tabela.
- Rotas protegidas sob `src/routes/_authenticated/` com o gate padrão da integração (`ssr: false`); `/` redireciona para `/dashboard` ou `/auth` conforme a sessão.
- `attachSupabaseAuth` adicionado ao `functionMiddleware` em `src/start.ts`; `onAuthStateChange` registrado uma vez no root.
- Auto-confirmação de e-mail habilitada para o cadastro já entrar direto (confirmo antes de aplicar se preferir manter o e-mail de confirmação).
- `head()` próprio por rota com título/descrição do app.
