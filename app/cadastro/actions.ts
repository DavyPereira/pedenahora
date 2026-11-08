"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, getCurrentAdmin } from "@/lib/session-helpers";
import { signUpSchema, createStoreSchema } from "@/lib/schemas/signup";
import { DEFAULT_WHATSAPP_TEMPLATE } from "@/lib/whatsapp-template";

export async function createStoreForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  storeName: string,
  slug: string
): Promise<string | undefined> {
  const { data: existingSlug } = await supabase
    .from("stores")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existingSlug) return "Esse slug já está em uso, escolha outro";

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .insert({
      store_name: storeName,
      store_description: "",
      slug,
      whatsapp_message_template: DEFAULT_WHATSAPP_TEMPLATE,
      // Ícone neutro: o default do banco é "Cookie", que fazia toda loja nova
      // herdar os emojis da Lolo Cookies até o dono trocar manualmente.
      brand_icon: "Store",
    })
    .select("id")
    .single();
  if (storeError || !store) return "Erro ao criar a loja";

  const { error: linkError } = await supabase
    .from("store_admins")
    .insert({ store_id: store.id, user_id: userId });
  if (linkError) return "Erro ao vincular administrador à loja";

  return undefined;
}

async function createStoreForCurrentUser(storeName: string, slug: string): Promise<string | undefined> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Não autorizado";

  return createStoreForUser(supabase, user.id, storeName, slug);
}

export type SignUpState = { error?: string; info?: string };

export async function signUpAction(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const parsed = signUpSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
    storeName: String(formData.get("storeName") ?? ""),
    slug: String(formData.get("slug") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();

  const { data: existingSlug } = await supabase
    .from("stores")
    .select("id")
    .eq("slug", parsed.data.slug)
    .maybeSingle();
  if (existingSlug) return { error: "Esse slug já está em uso, escolha outro" };

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { name: parsed.data.name } },
  });
  if (signUpError) {
    return {
      error:
        signUpError.message === "User already registered"
          ? "Esse e-mail já está cadastrado"
          : "Não foi possível criar a conta",
    };
  }

  if (!signUpData.session) {
    return {
      info: "Enviamos um link de confirmação para o seu e-mail. Depois de confirmar, faça login para finalizar o cadastro da sua loja.",
    };
  }

  const error = await createStoreForCurrentUser(parsed.data.storeName, parsed.data.slug);
  if (error) return { error };

  redirect("/admin");
}

export type CreateStoreState = { error?: string };

export async function createStoreAction(
  _prev: CreateStoreState,
  formData: FormData
): Promise<CreateStoreState> {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const admin = await getCurrentAdmin();
  if (admin) redirect("/admin");

  const parsed = createStoreSchema.safeParse({
    storeName: String(formData.get("storeName") ?? ""),
    slug: String(formData.get("slug") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const error = await createStoreForCurrentUser(parsed.data.storeName, parsed.data.slug);
  if (error) return { error };

  redirect("/admin");
}
