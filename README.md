# SweetOrder

Plataforma SaaS multi-tenant que dá a pequenos negócios (docerias, perfumarias,
lojas de roupa, suplementos etc.) um catálogo online pronto pra vender, sem
precisar de site próprio, com pedidos caindo direto no WhatsApp da loja.

Projeto pessoal, construído do zero — do checkout ao painel administrativo de
cada loja e ao painel de super-admin que gerencia todos os clientes da
plataforma.

## Como funciona

Cada loja é um **tenant** com seu próprio slug (`/nome-da-loja`), catálogo,
identidade visual, horário de funcionamento e formas de pagamento — tudo
isolado por `store_id` com Row Level Security no Postgres. O cliente final não
faz login: monta o carrinho, preenche entrega/pagamento no checkout, e o
pedido é formatado numa mensagem que abre direto no WhatsApp da loja.

- **`/` (marketing)** — landing page da plataforma, lista as lojas publicadas.
- **`/[slug]`** — catálogo público da loja: busca, filtro por categoria,
  carrinho, checkout guiado, acompanhamento de pedidos.
- **`/admin`** — painel de quem é dono da loja: produtos e estoque, dados da
  loja (nome, cores, logo, PIX, parcelamento), horário de funcionamento,
  fechamento pontual.
- **`/superadmin`** — visão da plataforma como um todo: todos os clientes,
  cadastro de novas lojas, convite de administradores.

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack) + **React 19** + TypeScript
- **Tailwind CSS v4** + **shadcn/radix-ui** para os componentes de UI
- **Supabase** (Postgres + Auth + RLS) como banco de dados e autenticação —
  sem backend separado, a lógica de servidor vive em Server Actions
- **Cloudflare R2** para armazenamento de imagens (produtos, logos), com
  redimensionamento e recompressão automática (via `sharp`) em todo upload
- **React Hook Form + Zod** para formulários e validação
- **TanStack Query** no client

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha com suas chaves (Supabase + R2)
npm run dev
```

O schema do banco fica em `supabase/schema.sql` e as migrações incrementais
em `supabase/migration-*.sql` — rode na ordem no SQL Editor do seu projeto
Supabase.

## Scripts

- `npm run dev` — ambiente de desenvolvimento
- `npm run build` / `npm run start` — build e servidor de produção
- `npm run lint` — ESLint
- `npx tsx scripts/reoptimize-images.ts [--dry-run]` — reprocessa imagens já
  hospedadas no R2 (resize + WebP), útil após mudanças na pipeline de upload


  ### GitHub Achievements

Experimentando o fluxo de Pull Requests do GitHub.
