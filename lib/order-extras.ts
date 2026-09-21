// Adicionais opcionais que o cliente escolhe por item, numa etapa em tela
// cheia que abre ao adicionar um produto ao carrinho (ver components/catalog.tsx,
// StoreExtraStep). Por enquanto só a Salada de Frutas oferece essa opção — mesmo
// padrão de PICKUP_ENABLED_SLUGS em components/checkout.tsx: lista fixa por loja.
//
// Os 2 primeiros adicionais escolhidos são grátis; a partir do 3º, cada um
// cobra uma taxa extra (aplicada ao preço daquele item do carrinho).
export const FREE_EXTRAS_LIMIT = 2;
export const EXTRA_FEE = 3;

export function calcExtrasFee(extrasCount: number): number {
  return Math.max(0, extrasCount - FREE_EXTRAS_LIMIT) * EXTRA_FEE;
}

export type StoreExtraOption = {
  label: string;
  emoji: string;
  bg: string;
  imageUrl: string | null;
};

const STORE_ORDER_EXTRAS: Record<string, StoreExtraOption[]> = {
  saladadefrutas: [
    {
      label: "Leite condensado",
      emoji: "🥫",
      bg: "#fdf1d9",
      imageUrl:
        "https://pub-6c6725674d9e493b9e62fa70cc59fd66.r2.dev/order-extras/saladadefrutas/leite-condensado-723f02e2-d8dd-4e6a-b5cd-64c7d3492012.webp",
    },
    {
      label: "Mel",
      emoji: "🍯",
      bg: "#fdeecb",
      imageUrl:
        "https://pub-6c6725674d9e493b9e62fa70cc59fd66.r2.dev/order-extras/saladadefrutas/mel-ac033fa6-7f27-4e98-989e-507e1bbcecac.webp",
    },
    {
      label: "Leite em pó",
      emoji: "🥛",
      bg: "#f2f2f2",
      imageUrl:
        "https://pub-6c6725674d9e493b9e62fa70cc59fd66.r2.dev/order-extras/saladadefrutas/leite-em-po-3d89ffe9-d848-47d0-b800-3125a28a5ce4.webp",
    },
    {
      label: "Farinha láctea",
      emoji: "🌾",
      bg: "#f6ecd9",
      imageUrl:
        "https://pub-6c6725674d9e493b9e62fa70cc59fd66.r2.dev/order-extras/saladadefrutas/farinha-lactea-188af213-e89b-49bc-8b88-cb6402d6e561.webp",
    },
  ],
};

export function getStoreOrderExtras(slug: string): StoreExtraOption[] {
  return STORE_ORDER_EXTRAS[slug] ?? [];
}
