import { notFound } from "next/navigation";
import { CartProvider } from "@/lib/cart-context";
import { getStoreBySlug } from "@/lib/settings";

const COOKIE_ICON_SVG_PATHS = [
  "M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5",
  "M8.5 8.5v.01",
  "M16 15.5v.01",
  "M12 12v.01",
  "M11 17v.01",
  "M7 14v.01",
];

// Lojas com fundo colorido no lugar do creme padrão. Os tons bege de apoio
// (bordas, áreas secundárias, textos claros) também são trocados por versões
// do mesmo matiz para não destoar; os cards continuam brancos.
const STORE_SURFACE_VARS: Record<string, string> = {
  // Azul claro derivado do azul dos botões da Criart (#0076D4, matiz ~250).
  graficacriart: [
    "--background: oklch(0.93 0.04 245)",
    "--foreground: oklch(0.22 0.04 255)",
    "--card-foreground: oklch(0.22 0.04 255)",
    "--popover-foreground: oklch(0.22 0.04 255)",
    "--secondary: oklch(0.89 0.05 245)",
    "--secondary-foreground: oklch(0.25 0.05 255)",
    "--accent: oklch(0.89 0.05 245)",
    "--accent-foreground: oklch(0.25 0.05 255)",
    "--muted: oklch(0.90 0.045 245)",
    "--muted-foreground: oklch(0.46 0.05 250)",
    "--border: oklch(0.84 0.05 245)",
    "--input: oklch(0.84 0.05 245)",
  ].join("; ") + ";",
};

function buildCookieFaviconUrl(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${COOKIE_ICON_SVG_PATHS.map(
    (d) => `<path d="${d}"/>`
  ).join("")}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = await getStoreBySlug(slug);
  if (!settings) return {};

  if (slug === "lolocookies") {
    const themeColor = /^#[0-9a-fA-F]{6}$/.test(settings.themeColor)
      ? settings.themeColor
      : "#4f7a5c";
    return {
      title: settings.storeName,
      description: settings.storeDescription,
      icons: { icon: buildCookieFaviconUrl(themeColor) },
    };
  }

  return {
    title: settings.storeName,
    description: settings.storeDescription,
  };
}

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const settings = await getStoreBySlug(slug);
  if (!settings) notFound();

  const themeColor = /^#[0-9a-fA-F]{6}$/.test(settings.themeColor)
    ? settings.themeColor
    : "#4f7a5c";

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `:root { --primary: ${themeColor}; --ring: ${themeColor}; ${STORE_SURFACE_VARS[slug] ?? ""} }`,
        }}
      />
      <CartProvider settings={settings}>{children}</CartProvider>
    </>
  );
}
