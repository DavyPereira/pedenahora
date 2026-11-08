import Link from "next/link";
import { ArrowRight, Layers, Package, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/session-helpers";
import { getStoreById } from "@/lib/settings";
import { getStoreIcon } from "@/lib/store-icons";
import { getTodayDateInStoreTimezone } from "@/lib/business-hours-status";
import { StoreClosureToggle } from "@/components/admin/store-closure-toggle";

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const [{ count: totalProducts }, { count: activeProducts }, { data: categoryRows }, store] =
    await Promise.all([
      supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("store_id", admin.storeId),
      supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("store_id", admin.storeId)
        .eq("active", true),
      supabase.from("products").select("category").eq("store_id", admin.storeId),
      getStoreById(admin.storeId),
    ]);
  const categories = new Set((categoryRows ?? []).map((p) => p.category));
  const ActiveIcon = getStoreIcon(store.brandIcon);

  return (
    <div>
      <h1 className="font-heading text-3xl font-black tracking-tight">
        Olá, {admin.name} 👋
      </h1>
      <p className="mt-1.5 text-muted-foreground">
        Gerencie os produtos e as informações da sua loja por aqui.
      </p>

      <div className="mt-6">
        <StoreClosureToggle
          initialClosedToday={store.manuallyClosedDate === getTodayDateInStoreTimezone()}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<Package className="w-4 h-4" />} label="Produtos" value={totalProducts ?? 0} color="var(--primary)" />
        <StatCard icon={<ActiveIcon className="w-4 h-4" />} label="Ativos no catálogo" value={activeProducts ?? 0} color="var(--primary)" />
        <StatCard icon={<Layers className="w-4 h-4" />} label="Categorias" value={categories.size} color="var(--primary)" />
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NavCard
          href="/admin/produtos"
          icon={<Package className="w-7 h-7" />}
          title="Produtos"
          description="Cadastre, edite e organize os produtos do catálogo."
        />
        <NavCard
          href="/admin/loja"
          icon={<Store className="w-7 h-7" />}
          title="Configurações da loja"
          description="WhatsApp, taxa de entrega e demais informações."
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-3xl border-2 border-border bg-card p-5">
      <div className="flex items-center gap-2.5 mb-1.5">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
        <span className="font-heading font-bold text-sm">{label}</span>
      </div>
      <span className="font-heading text-4xl font-black tracking-tight tabular-nums">{value}</span>
    </div>
  );
}

function NavCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group relative w-full p-5 rounded-2xl border-2 border-border bg-card flex items-center gap-5 transition-all duration-200 hover:border-foreground active:scale-[0.98]"
    >
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: "var(--secondary)", color: "var(--muted-foreground)" }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <span className="font-heading text-xl font-bold">{title}</span>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}
