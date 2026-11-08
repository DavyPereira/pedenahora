import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getDominantColor } from "@/lib/dominant-color";
import type { StoreListItemDTO, StoreSettingsDTO } from "@/lib/types";

// Lojas que devem manter o fundo branco original atrás do logo,
// em vez da cor predominante extraída da imagem.
const LOGO_BG_COLOR_EXCLUDED_SLUGS = ["lolocookies", "saladadefrutas"];

async function resolveLogoBgColor(slug: string, logoUrl: string | null): Promise<string | null> {
  if (!logoUrl || LOGO_BG_COLOR_EXCLUDED_SLUGS.includes(slug)) return null;
  return getDominantColor(logoUrl);
}

function mapStoreRow(row: {
  id: string;
  store_name: string;
  store_description: string;
  slug: string;
  email: string;
  whatsapp_number: string;
  whatsapp_message_template: string;
  free_delivery_threshold: number;
  delivery_fee: number;
  instagram_url: string;
  accepts_pix: boolean;
  pix_key: string;
  accepts_cash: boolean;
  accepts_card: boolean;
  accepts_installments: boolean;
  accepts_delivery: boolean;
  brand_color: string;
  theme_color: string;
  brand_icon: string;
  logo_url: string | null;
  is_published: boolean;
  manually_closed_date: string | null;
}, logoBgColor: string | null): StoreSettingsDTO {
  return {
    id: row.id,
    storeName: row.store_name,
    storeDescription: row.store_description,
    slug: row.slug,
    email: row.email,
    whatsappNumber: row.whatsapp_number,
    whatsappMessageTemplate: row.whatsapp_message_template,
    freeDeliveryThreshold: row.free_delivery_threshold,
    deliveryFee: row.delivery_fee,
    instagramUrl: row.instagram_url,
    acceptsPix: row.accepts_pix,
    pixKey: row.pix_key,
    acceptsCash: row.accepts_cash,
    acceptsCard: row.accepts_card,
    acceptsInstallments: row.accepts_installments,
    acceptsDelivery: row.accepts_delivery,
    brandColor: row.brand_color,
    themeColor: row.theme_color,
    brandIcon: row.brand_icon,
    logoUrl: row.logo_url,
    logoBgColor,
    isPublished: row.is_published,
    manuallyClosedDate: row.manually_closed_date,
  };
}

export const getStoreBySlug = cache(async (slug: string): Promise<StoreSettingsDTO | null> => {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!row) return null;

  const logoBgColor = await resolveLogoBgColor(row.slug, row.logo_url);
  return mapStoreRow(row, logoBgColor);
});

export async function getStoreById(id: string): Promise<StoreSettingsDTO> {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("stores")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  const logoBgColor = await resolveLogoBgColor(row.slug, row.logo_url);
  return mapStoreRow(row, logoBgColor);
}

export async function getAllStores(): Promise<StoreListItemDTO[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stores")
    .select("id, slug, store_name, store_description, brand_color, is_published, logo_url")
    .order("store_name", { ascending: true });

  if (error) throw error;

  return Promise.all(
    data.map(async (row) => ({
      id: row.id,
      slug: row.slug,
      storeName: row.store_name,
      storeDescription: row.store_description,
      brandColor: row.brand_color,
      isPublished: row.is_published,
      logoUrl: row.logo_url,
      logoBgColor: await resolveLogoBgColor(row.slug, row.logo_url),
    }))
  );
}
