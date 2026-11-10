// Endereços de retirada por loja (slug). Fonte única: checkout, revisão do
// pedido, "Meus pedidos" e o mapa de localização leem daqui.
//
// latitude/longitude são opcionais: o botão "Ver localização da loja" só
// aparece quando as duas estão preenchidas e são válidas. Não preencha com
// coordenadas aproximadas — pegue o ponto exato da loja no Google Maps
// (segurar o dedo sobre a loja → os números aparecem na busca, ex.: -3.68, -39.58).

export type PickupLocation = {
  street: string;
  number: string;
  neighborhood: string;
  city?: string;
  state?: string;
  cep?: string;
  latitude?: number;
  longitude?: number;
};

export type PickupCoordinates = { latitude: number; longitude: number };

export const PICKUP_LOCATIONS: Record<string, PickupLocation> = {
  lolocookies: {
    street: "Rua Eufrásio Carneiro",
    number: "201",
    neighborhood: "Cruzeiro",
    // Cidade confirmada pelos pedidos de entrega da loja (quase todos Itapajé/CE).
    city: "Itapajé",
    state: "CE",
  },
  graficacriart: {
    street: "Travessa Teixeira Bastos",
    number: "39",
    neighborhood: "Centro",
    city: "Itapajé",
    state: "CE",
    // Ponto exato informado pelo dono da loja (Google Maps), 2026-11-09.
    latitude: -3.684755570820495,
    longitude: -39.58625167458856,
  },
};

export function getPickupLocation(slug: string): PickupLocation | null {
  return PICKUP_LOCATIONS[slug] ?? null;
}

/** Linha curta usada no checkout e na mensagem do WhatsApp (formato original). */
export function formatPickupAddress(a: PickupLocation): string {
  return `${a.street}, ${a.number} - ${a.neighborhood}`;
}

/** Endereço completo (com cidade/UF/CEP quando houver), usado no modal do mapa. */
export function formatFullPickupAddress(a: PickupLocation): string {
  const cityState = [a.city, a.state].filter(Boolean).join("/");
  return [formatPickupAddress(a), cityState, a.cep ? `CEP ${a.cep}` : ""].filter(Boolean).join(", ");
}

function isValidCoordinate(value: unknown, limit: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;
}

/** Coordenadas da loja, ou null se ausentes/inválidas (o mapa então não é oferecido). */
export function getPickupCoordinates(a: PickupLocation | null | undefined): PickupCoordinates | null {
  if (!a) return null;
  const { latitude, longitude } = a;
  if (!isValidCoordinate(latitude, 90) || !isValidCoordinate(longitude, 180)) return null;
  // (0, 0) é o valor típico de campo "não preenchido", não uma loja real.
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
}

export function googleMapsDirectionsUrl({ latitude, longitude }: PickupCoordinates): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}
