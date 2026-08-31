/**
 * Script de execução única: reprocessa (redimensiona + recomprime pra WebP) as
 * fotos de produtos e logos que já estão no R2, feitas antes da compressão no
 * upload existir. Atualiza image_url/logo_url no banco e apaga o arquivo antigo.
 *
 * Uso: npx tsx scripts/reoptimize-images.ts [--dry-run]
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import ws from "ws";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

// Node 20 não tem WebSocket nativo; o client do supabase-js instancia um
// RealtimeClient mesmo sem usarmos realtime, então precisa do polyfill.
(globalThis as { WebSocket?: unknown }).WebSocket ??= ws;

const DRY_RUN = process.argv.includes("--dry-run");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const publicUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});
const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 82;
// Abaixo disso a imagem provavelmente já foi processada pelo novo código de upload; pula.
const SKIP_THRESHOLD_BYTES = 350 * 1024;

async function processAndReupload(prefix: "products" | "logos", storeId: string, url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  ⚠ falha ao baixar ${url}: HTTP ${res.status}`);
    return null;
  }
  const original = Buffer.from(await res.arrayBuffer());

  if (original.byteLength <= SKIP_THRESHOLD_BYTES) {
    console.log(`  ↷ já pequena (${(original.byteLength / 1024).toFixed(0)}KB), pulando`);
    return null;
  }

  const processed = await sharp(original)
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  console.log(
    `  ${(original.byteLength / 1024).toFixed(0)}KB → ${(processed.byteLength / 1024).toFixed(0)}KB`
  );

  if (DRY_RUN) return null;

  const key = `${prefix}/${storeId}/${crypto.randomUUID()}.webp`;
  await r2.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: processed, ContentType: "image/webp" })
  );
  const newUrl = `${publicUrl}/${key}`;

  const oldKey = url.startsWith(publicUrl) ? url.slice(publicUrl.length + 1) : null;
  if (oldKey) {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: oldKey })).catch(() => {});
  }

  return newUrl;
}

async function reoptimizeProducts() {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, store_id, image_url")
    .not("image_url", "is", null);
  if (error) throw error;

  console.log(`\nProdutos com imagem: ${products.length}`);
  for (const p of products) {
    console.log(`- produto ${p.id}`);
    const newUrl = await processAndReupload("products", p.store_id, p.image_url!);
    if (newUrl) {
      const { error: updateError } = await supabase
        .from("products")
        .update({ image_url: newUrl })
        .eq("id", p.id);
      if (updateError) console.error(`  ✗ erro ao atualizar produto ${p.id}:`, updateError.message);
      else console.log(`  ✓ atualizado`);
    }
  }
}

async function reoptimizeLogos() {
  const { data: stores, error } = await supabase
    .from("stores")
    .select("id, logo_url")
    .not("logo_url", "is", null);
  if (error) throw error;

  console.log(`\nLojas com logo: ${stores.length}`);
  for (const s of stores) {
    console.log(`- loja ${s.id}`);
    const newUrl = await processAndReupload("logos", s.id, s.logo_url!);
    if (newUrl) {
      const { error: updateError } = await supabase
        .from("stores")
        .update({ logo_url: newUrl })
        .eq("id", s.id);
      if (updateError) console.error(`  ✗ erro ao atualizar loja ${s.id}:`, updateError.message);
      else console.log(`  ✓ atualizado`);
    }
  }
}

async function main() {
  if (DRY_RUN) console.log("*** DRY RUN — nada será modificado ***");
  await reoptimizeProducts();
  await reoptimizeLogos();
  console.log("\nConcluído.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
