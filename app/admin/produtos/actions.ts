"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/session-helpers";
import { uploadImageToR2, deleteImageFromR2 } from "@/lib/r2";
import { processImageForUpload } from "@/lib/image";

const productSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  description: z.string().trim().min(1, "Descrição é obrigatória"),
  price: z.coerce.number().positive("Preço deve ser maior que zero"),
  category: z.string().trim().min(1, "Categoria é obrigatória"),
  visualBg: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida (use um hex, ex: #F2E0C4)"),
  visualEmoji: z.string().trim().min(1, "Emoji é obrigatório").max(4, "Use apenas 1 emoji"),
  imageUrl: z.string().trim().url().nullable().optional(),
  cardPrice: z.number().positive("Preço deve ser maior que zero").nullable().optional(),
  stockQuantity: z.coerce
    .number()
    .int("Quantidade deve ser um número inteiro")
    .min(0, "Quantidade não pode ser negativa")
    .nullable()
    .optional(),
});

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type UploadImageState = { url?: string; error?: string };

export async function uploadProductImage(formData: FormData): Promise<UploadImageState> {
  const admin = await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione uma imagem" };

  if (!ALLOWED_IMAGE_TYPES[file.type]) return { error: "Formato inválido. Use JPG, PNG ou WEBP." };
  if (file.size > MAX_IMAGE_SIZE) return { error: "Imagem muito grande (máx. 5MB)" };

  try {
    const { buffer, contentType, ext } = await processImageForUpload(
      Buffer.from(await file.arrayBuffer())
    );
    const key = `products/${admin.storeId}/${crypto.randomUUID()}.${ext}`;
    const url = await uploadImageToR2(key, buffer, contentType);
    return { url };
  } catch {
    return { error: "Erro ao enviar imagem" };
  }
}

export type ProductInput = z.infer<typeof productSchema>;
export type ProductActionState = { error?: string };

function revalidateProductPaths() {
  revalidatePath("/admin/produtos");
  revalidatePath("/[slug]", "layout");
}

async function resolveCardPrice(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storeId: string,
  data: ProductInput
): Promise<number | null> {
  const { data: store } = await supabase
    .from("stores")
    .select("accepts_installments")
    .eq("id", storeId)
    .single();

  if (!store?.accepts_installments) return null;
  return data.cardPrice ?? null;
}

export async function createProduct(data: ProductInput): Promise<ProductActionState> {
  const admin = await requireAdmin();
  const parsed = productSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const [{ data: last }, cardPrice] = await Promise.all([
    supabase
      .from("products")
      .select("sort_order")
      .eq("store_id", admin.storeId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle(),
    resolveCardPrice(supabase, admin.storeId, parsed.data),
  ]);

  const { error } = await supabase.from("products").insert({
    store_id: admin.storeId,
    name: parsed.data.name,
    description: parsed.data.description,
    price: parsed.data.price,
    category: parsed.data.category,
    visual_bg: parsed.data.visualBg,
    visual_emoji: parsed.data.visualEmoji,
    image_url: parsed.data.imageUrl ?? null,
    sort_order: (last?.sort_order ?? 0) + 1,
    card_price: cardPrice,
    stock_quantity: parsed.data.stockQuantity ?? null,
  });
  if (error) return { error: "Erro ao criar produto" };

  revalidateProductPaths();
  return {};
}

export async function updateProduct(id: string, data: ProductInput): Promise<ProductActionState> {
  const admin = await requireAdmin();
  const parsed = productSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("products")
    .select("image_url")
    .eq("id", id)
    .eq("store_id", admin.storeId)
    .maybeSingle();

  const newImageUrl = parsed.data.imageUrl ?? null;
  const cardPrice = await resolveCardPrice(supabase, admin.storeId, parsed.data);

  const { error } = await supabase
    .from("products")
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      category: parsed.data.category,
      visual_bg: parsed.data.visualBg,
      visual_emoji: parsed.data.visualEmoji,
      image_url: newImageUrl,
      card_price: cardPrice,
      stock_quantity: parsed.data.stockQuantity ?? null,
    })
    .eq("id", id)
    .eq("store_id", admin.storeId);
  if (error) return { error: "Erro ao atualizar produto" };

  if (existing?.image_url && existing.image_url !== newImageUrl) {
    await deleteImageFromR2(existing.image_url).catch(() => {});
  }

  revalidateProductPaths();
  return {};
}

export async function deleteProduct(id: string) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("products")
    .select("image_url")
    .eq("id", id)
    .eq("store_id", admin.storeId)
    .maybeSingle();

  await supabase.from("products").delete().eq("id", id).eq("store_id", admin.storeId);

  if (existing?.image_url) {
    await deleteImageFromR2(existing.image_url).catch(() => {});
  }

  revalidateProductPaths();
}

export async function toggleProductActive(id: string, active: boolean) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  await supabase.from("products").update({ active }).eq("id", id).eq("store_id", admin.storeId);
  revalidateProductPaths();
}
