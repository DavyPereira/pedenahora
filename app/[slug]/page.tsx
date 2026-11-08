import { notFound } from "next/navigation";
import { Catalog } from "@/components/catalog";
import { getActiveProducts } from "@/lib/products";
import { getStoreBySlug } from "@/lib/settings";
import { getBusinessHours } from "@/lib/business-hours";

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = await getStoreBySlug(slug);
  if (!settings) notFound();

  const [products, businessHours] = await Promise.all([
    getActiveProducts(settings.id),
    getBusinessHours(settings.id),
  ]);

  return (
    <Catalog
      slug={slug}
      products={products}
      storeName={settings.storeName}
      freeDeliveryThreshold={settings.freeDeliveryThreshold}
      businessHours={businessHours}
      brandIcon={settings.brandIcon}
      manuallyClosedDate={settings.manuallyClosedDate}
      acceptsInstallments={settings.acceptsInstallments}
      logoUrl={settings.logoUrl}
      logoBgColor={settings.logoBgColor}
      storeDescription={settings.storeDescription}
      instagramUrl={settings.instagramUrl}
    />
  );
}
