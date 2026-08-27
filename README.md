# Seu Bolso Feliz

Controle de gastos pessoal, Crie um app de Controle Financeiro Pessoal em React + TypeScript + Tailwind + Supabase, em português brasileiro (pt-BR), moeda em Real (R$) e datas em DD/MM/AAAA.

DESIGN SYSTEM (defina como tokens/variáveis e use em TODO o app):

- Negativo / déficit → vermelho #C62828

- Positivo / saldo positivo → azul #1F4E78

- Entrada / receita → verde #2E7D32

- Status Pendente → texto #F9A825 sobre fundo #FFF3CD

- Status Pago → texto #2E7D32 sobre fundo #C6EFCE

- Acento de parcelas → roxo #6A1B9A

Configure o Supabase com autenticação email/senha e RLS em todas as tabelas (cada usuário só acessa onde user_id = auth.uid()).

Crie as tabelas:

categorias: id, user_id, nome, tipo ('receita'|'despesa'), cor

lancamentos: id, user_id, data (date), categoria_id, descricao, valor (numeric), tipo ('receita'|'despesa'), status ('pago'|'pendente'), ano (int), mes (int 1-12)

contas_fixas: id, user_id, dia (int 1-31), descricao, categoria_id, valor (numeric), ativo (bool default true)

parcelas: id, user_id, descricao, categoria_id, valor_parcela (numeric), num_parcelas (int), mes_inicio (int 1-12), ano_inicio (int), data_primeira_parcela (date), status ('ativo'|'quitado' default 'ativo')

Ao criar um novo usuário, faça seed automático das categorias:

- Despesas: Moradia, Transporte, Pensão, Educação, Contas (água/luz/gás), Mercado / Alimentação, Saúde / Farmácia, Lazer / Assinaturas, Vestuário, Cartão de crédito, Parcelas, Investimentos / Poupança, Outros

- Receitas: Salário, Freelance / Extra, Rendimentos, Reembolsos, Outros

E seed automático das 7 contas fixas do usuário:

| Dia | Descrição | Categoria | Valor |

| 15 | Aluguel | Moradia | 1200.00 |

| 05 | Carro | Transporte | 1456.00 |

| 20 | Pensão | Pensão | 500.00 |

| 15 | Escola Aurora | Educação | 385.00 |

| 20 | Rhema | Educação | 289.00 |

| 20 | Internet | Moradia | 140.00 |

| 15 | Internet Celular | Moradia | 70.00 |

Crie uma tela de login/cadastro e um layout base com sidebar (ícones: Dashboard, Mês, Contas Fixas, Parcelas), responsivo mobile-first. Ainda não implemente as telas internas — só a estrutura de navegação e o design system.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://guia-de-bolso.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fd6ad0c4-4849-41a8-902e-69324894cce8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
