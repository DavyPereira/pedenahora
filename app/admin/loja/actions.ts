"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/session-helpers";
import { storeSettingsSchema, type StoreSettingsFormData } from "@/lib/schemas/store-settings";
import { businessHoursSchema, type BusinessHoursFormData } from "@/lib/schemas/business-hours";
import { getTodayDateInStoreTimezone } from "@/lib/business-hours-status";
import { uploadImageToR2, deleteImageFromR2 } from "@/lib/r2";
import { processImageForUpload } from "@/lib/image";

export type SettingsInput = StoreSettingsFormData;
export type SettingsActionState = { error?: string };

const MAX_LOGO_SIZE = 5 * 1024 * 1024;
const ALLOWED_LOGO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type UploadLogoState = { url?: string; error?: string };

export async function uploadStoreLogo(formData: FormData): Promise<UploadLogoState> {
  const admin = await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione uma imagem" };

  if (!ALLOWED_LOGO_TYPES[file.type]) return { error: "Formato inválido. Use JPG, PNG ou WEBP." };
  if (file.size > MAX_LOGO_SIZE) return { error: "Imagem muito grande (máx. 5MB)" };

  try {
    const { buffer, contentType, ext } = await processImageForUpload(
      Buffer.from(await file.arrayBuffer())
    );
    const key = `logos/${admin.storeId}/${crypto.randomUUID()}.${ext}`;
    const url = await uploadImageToR2(key, buffer, contentType);
    return { url };
  } catch {
    return { error: "Erro ao enviar imagem" };
  }
}

export async function updateStoreSettings(data: SettingsInput): Promise<SettingsActionState> {
  const admin = await requireAdmin();
  const parsed = storeSettingsSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("stores")
    .select("logo_url")
    .eq("id", admin.storeId)
    .maybeSingle();

  const newLogoUrl = parsed.data.logoUrl ?? null;

  const { error } = await supabase
    .from("stores")
    .update({
      store_name: parsed.data.storeName,
      store_description: parsed.data.storeDescription,
      slug: parsed.data.slug,
      email: parsed.data.email,
      whatsapp_number: parsed.data.whatsappNumber,
      whatsapp_message_template: parsed.data.whatsappMessageTemplate,
      free_delivery_threshold: parsed.data.freeDeliveryThreshold,
      delivery_fee: parsed.data.deliveryFee,
      instagram_url: parsed.data.instagramUrl,
      accepts_pix: parsed.data.acceptsPix,
      pix_key: parsed.data.pixKey,
      accepts_cash: parsed.data.acceptsCash,
      accepts_card: parsed.data.acceptsCard,
      brand_color: parsed.data.brandColor,
      theme_color: parsed.data.themeColor,
      brand_icon: parsed.data.brandIcon,
      logo_url: newLogoUrl,
      is_published: parsed.data.isPublished,
    })
    .eq("id", admin.storeId);
  if (error) return { error: "Erro ao salvar configurações" };

  if (existing?.logo_url && existing.logo_url !== newLogoUrl) {
    await deleteImageFromR2(existing.logo_url).catch(() => {});
  }

  revalidatePath("/admin/loja");
  revalidatePath("/");
  revalidatePath("/[slug]", "layout");
  return {};
}

function revalidateStorefrontPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/loja");
  revalidatePath("/");
  revalidatePath("/[slug]", "layout");
}

export async function closeStoreToday(): Promise<SettingsActionState> {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("stores")
    .update({ manually_closed_date: getTodayDateInStoreTimezone() })
    .eq("id", admin.storeId);
  if (error) return { error: "Erro ao fechar a loja" };

  revalidateStorefrontPaths();
  return {};
}

export async function reopenStore(): Promise<SettingsActionState> {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("stores")
    .update({ manually_closed_date: null })
    .eq("id", admin.storeId);
  if (error) return { error: "Erro ao reabrir a loja" };

  revalidateStorefrontPaths();
  return {};
}

export type BusinessHoursInput = BusinessHoursFormData;

export async function updateBusinessHours(data: BusinessHoursInput): Promise<SettingsActionState> {
  const admin = await requireAdmin();
  const parsed = businessHoursSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const rows = parsed.data.days.flatMap((day) =>
    day.isOpen
      ? day.shifts.map((shift, sortOrder) => ({
          store_id: admin.storeId,
          day_of_week: day.dayOfWeek,
          open_time: shift.openTime,
          close_time: shift.closeTime,
          sort_order: sortOrder,
        }))
      : []
  );

  const supabase = await createClient();
  const { error: deleteError } = await supabase
    .from("business_hour_shifts")
    .delete()
    .eq("store_id", admin.storeId);
  if (deleteError) return { error: "Erro ao salvar horários" };

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from("business_hour_shifts").insert(rows);
    if (insertError) return { error: "Erro ao salvar horários" };
  }

  revalidatePath("/admin/loja");
  revalidatePath("/");
  revalidatePath("/[slug]", "layout");
  return {};
}
