import "server-only";
import sharp from "sharp";

const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 82;

export type ProcessedImage = {
  buffer: Buffer;
  contentType: string;
  ext: string;
};

/**
 * Redimensiona (sem ampliar) e recomprime para WebP antes do upload.
 * Evita subir fotos de câmera/celular de vários MB direto pro R2 — a otimização
 * de imagem do Next está desligada em produção (cota do Vercel esgotada), então
 * sem isso o navegador baixaria a imagem crua em toda visita ao catálogo.
 */
export async function processImageForUpload(input: Buffer): Promise<ProcessedImage> {
  const buffer = await sharp(input)
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return { buffer, contentType: "image/webp", ext: "webp" };
}
