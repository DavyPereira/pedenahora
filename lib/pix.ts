// Gera o "Pix Copia e Cola" (BR Code estático, padrão EMV do Banco Central)
// a partir da chave Pix cadastrada pela loja. O mesmo texto vira o QR Code.

export type PixKeyType = "cpf" | "cnpj" | "phone" | "email" | "random";
export type NormalizedPixKey = { type: PixKeyType; key: string };

function isValidCpf(d: string): boolean {
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
  for (const n of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += Number(d[i]) * (n + 1 - i);
    if (((sum * 10) % 11) % 10 !== Number(d[n])) return false;
  }
  return true;
}

function isValidCnpj(d: string): boolean {
  if (!/^\d{14}$/.test(d) || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((s, w, i) => s + Number(d[i]) * w, 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

/**
 * Converte a chave como o lojista digitou (com pontos, espaços, traços) para o
 * formato que o Banco Central exige. Retorna null quando não dá para ter
 * certeza do tipo — nesse caso o Pix copia e cola não é oferecido, para nunca
 * gerar um código que mande o dinheiro para a chave errada.
 */
export function normalizePixKey(raw: string): NormalizedPixKey | null {
  const value = raw.trim();
  if (!value) return null;

  if (value.includes("@")) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? { type: "email", key: value.toLowerCase() } : null;
  }

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return { type: "random", key: value.toLowerCase() };
  }

  const digits = value.replace(/\D/g, "");

  if (value.startsWith("+")) {
    return /^55\d{10,11}$/.test(digits) ? { type: "phone", key: `+${digits}` } : null;
  }

  if (digits.length === 14) return isValidCnpj(digits) ? { type: "cnpj", key: digits } : null;

  if (digits.length === 11) {
    const cpf = isValidCpf(digits);
    // Celular com DDD: DDD válido (11–99) + 9 + 8 dígitos.
    const phone = /^[1-9][1-9]9\d{8}$/.test(digits);
    if (cpf && phone) return null; // ambíguo: não arrisca
    if (cpf) return { type: "cpf", key: digits };
    if (phone) return { type: "phone", key: `+55${digits}` };
    return null;
  }

  // Telefone fixo com DDD (10 dígitos) ou celular já com 55 na frente.
  if (digits.length === 10 && /^[1-9][1-9][2-5]\d{7}$/.test(digits)) return { type: "phone", key: `+55${digits}` };
  if (/^55[1-9][1-9]9\d{8}$/.test(digits)) return { type: "phone", key: `+${digits}` };

  return null;
}

/** Remove acentos e caracteres fora do padrão do BR Code, em maiúsculas. */
function sanitize(text: string, maxLength: number): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, maxLength);
}

function field(id: string, value: string): string {
  return `${id}${value.length.toString().padStart(2, "0")}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildPixPayload({
  key,
  merchantName,
  merchantCity,
  amount,
}: {
  key: string;
  merchantName: string;
  merchantCity?: string;
  amount: number;
}): string {
  const name = sanitize(merchantName, 25) || "LOJA";
  const city = sanitize(merchantCity ?? "", 15) || "BRASIL";
  const payload =
    field("00", "01") +
    field("26", field("00", "br.gov.bcb.pix") + field("01", key)) +
    field("52", "0000") +
    field("53", "986") +
    (amount > 0 ? field("54", amount.toFixed(2)) : "") +
    field("58", "BR") +
    field("59", name) +
    field("60", city) +
    field("62", field("05", "***")) +
    "6304";
  return payload + crc16(payload);
}
