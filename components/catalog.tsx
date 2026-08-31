"use client";

import { useState, useMemo, useEffect, createElement } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  X,
  ArrowRight,
  Receipt,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart, type CookieItem, type CartEntry } from "@/lib/cart-context";
import {
  getBusinessHoursStatus,
  type BusinessHoursStatus,
} from "@/lib/business-hours-status";
import { getStoreEmoji, getStoreIcon } from "@/lib/store-icons";
import type { BusinessHourDayDTO } from "@/lib/types";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const HORIZONTAL_CARD_LAYOUT_SLUGS = ["lolocookies"];
const NATIONWIDE_SHIPPING_SLUGS = ["dakela-moda-intima"];

function CookieCard({
  cookie,
  quantity,
  index,
  onAdd,
  onRemove,
  disabled,
  acceptsInstallments,
}: {
  cookie: CookieItem;
  quantity: number;
  index: number;
  onAdd: () => void;
  onRemove: () => void;
  disabled?: boolean;
  acceptsInstallments: boolean;
}) {
  const isTracked = cookie.stockQuantity !== null;
  const isSoldOut = isTracked && cookie.stockQuantity! <= 0;
  const atMaxStock = isTracked && quantity >= cookie.stockQuantity!;

  return (
    <article
      className="group flex flex-col rounded-2xl overflow-hidden border border-border bg-card hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300"
      style={{
        animation: `card-in 0.55s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.07}s both`,
      }}
    >
      <div
        className="relative aspect-square flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: cookie.visual.bg }}
      >
        {cookie.imageUrl ? (
          <Image
            src={cookie.imageUrl}
            alt={cookie.name}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          />
        ) : (
          <span className="text-7xl select-none transition-transform duration-500 ease-out group-hover:scale-110 group-hover:rotate-[-8deg] drop-shadow-md">
            {cookie.visual.emoji}
          </span>
        )}

        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {quantity > 0 && (
          <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs font-heading font-bold px-2.5 py-1 rounded-full shadow-md">
            {quantity}× no carrinho
          </div>
        )}

        {isSoldOut && (
          <div className="absolute top-3 left-3 bg-foreground/90 text-background text-xs font-heading font-bold px-2.5 py-1 rounded-full shadow-md">
            Esgotado
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-5 gap-3">
        <div className="flex-1">
          <h3 className="font-heading text-xl font-bold leading-tight tracking-tight text-foreground">
            {cookie.name}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {cookie.description}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
          <div>
            <span className="font-heading text-2xl font-extrabold text-foreground tracking-tight">
              {fmt(cookie.price)}
            </span>
            {acceptsInstallments && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Parcele no cartão, valor varia conforme as parcelas
              </p>
            )}
          </div>

          {isSoldOut ? (
            <Button
              size="sm"
              disabled
              className="rounded-full h-9 px-4 text-sm font-semibold w-full sm:w-auto opacity-60 cursor-not-allowed"
            >
              Esgotado
            </Button>
          ) : quantity === 0 ? (
            <Button
              size="sm"
              onClick={onAdd}
              disabled={disabled}
              className="rounded-full h-9 px-4 gap-1.5 text-sm font-semibold active:scale-95 transition-transform w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar
            </Button>
          ) : (
            <div className="flex items-center gap-1 bg-secondary rounded-full p-1 w-full sm:w-auto justify-between sm:justify-start">
              <button
                onClick={onRemove}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-border transition-colors cursor-pointer active:scale-90"
                aria-label="Remover um"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-heading text-base font-bold w-5 text-center select-none tabular-nums">
                {quantity}
              </span>
              <button
                onClick={onAdd}
                disabled={disabled || atMaxStock}
                className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-all cursor-pointer active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Adicionar um"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function CookieCardHorizontal({
  cookie,
  quantity,
  index,
  onAdd,
  onRemove,
  disabled,
  acceptsInstallments,
}: {
  cookie: CookieItem;
  quantity: number;
  index: number;
  onAdd: () => void;
  onRemove: () => void;
  disabled?: boolean;
  acceptsInstallments: boolean;
}) {
  const isTracked = cookie.stockQuantity !== null;
  const isSoldOut = isTracked && cookie.stockQuantity! <= 0;
  const atMaxStock = isTracked && quantity >= cookie.stockQuantity!;

  return (
    <article
      className="flex items-start gap-4 py-5"
      style={{
        animation: `card-in 0.55s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.07}s both`,
      }}
    >
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div>
          <h3 className="font-heading text-base sm:text-lg font-bold leading-tight tracking-tight text-foreground">
            {cookie.name}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">
            {cookie.description}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 mt-auto pt-1">
          <div>
            <span className="font-heading text-lg font-extrabold text-foreground tracking-tight">
              {fmt(cookie.price)}
            </span>
            {acceptsInstallments && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Parcele no cartão
              </p>
            )}
          </div>

          {isSoldOut ? null : quantity === 0 ? (
            <Button
              size="sm"
              onClick={onAdd}
              disabled={disabled}
              className="rounded-full h-8 px-3.5 gap-1 text-xs font-semibold active:scale-95 transition-transform shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-3 h-3" />
              Adicionar
            </Button>
          ) : (
            <div className="flex items-center gap-1 bg-secondary rounded-full p-1 shrink-0">
              <button
                onClick={onRemove}
                className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-border transition-colors cursor-pointer active:scale-90"
                aria-label="Remover um"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="font-heading text-sm font-bold w-4 text-center select-none tabular-nums">
                {quantity}
              </span>
              <button
                onClick={onAdd}
                disabled={disabled || atMaxStock}
                className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-all cursor-pointer active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Adicionar um"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 rounded-2xl flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: cookie.visual.bg }}
      >
        {cookie.imageUrl ? (
          <Image
            src={cookie.imageUrl}
            alt={cookie.name}
            fill
            sizes="(min-width: 640px) 128px, 112px"
            className="object-cover"
          />
        ) : (
          <span className="text-4xl select-none drop-shadow-md">
            {cookie.visual.emoji}
          </span>
        )}

        {quantity > 0 && (
          <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground text-[10px] font-heading font-bold px-1.5 py-0.5 rounded-full shadow-md">
            {quantity}×
          </div>
        )}

        {isSoldOut && (
          <div className="absolute top-1.5 left-1.5 bg-foreground/90 text-background text-[10px] font-heading font-bold px-1.5 py-0.5 rounded-full shadow-md">
            Esgotado
          </div>
        )}
      </div>
    </article>
  );
}

function CartItemRow({
  entry,
  onAdd,
  onRemove,
  onDelete,
}: {
  entry: CartEntry;
  onAdd: () => void;
  onRemove: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-4 py-4">
      {entry.imageUrl ? (
        <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
          <Image src={entry.imageUrl} alt={entry.name} fill sizes="56px" className="object-cover" />
        </div>
      ) : (
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
          style={{ backgroundColor: entry.visual.bg }}
        >
          {entry.visual.emoji}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="font-heading text-base font-bold leading-tight truncate">
          {entry.name}
        </p>
        <p className="text-sm text-muted-foreground mb-2">{fmt(entry.price)} cada</p>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onRemove}
            className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer active:scale-90"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="font-heading text-base font-bold w-4 text-center tabular-nums">
            {entry.quantity}
          </span>
          <button
            onClick={onAdd}
            className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-all cursor-pointer active:scale-90"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      <button
        onClick={onDelete}
        className="self-start mt-1 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors cursor-pointer flex-shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export function Catalog({
  slug,
  products,
  storeName,
  freeDeliveryThreshold,
  businessHours,
  brandIcon,
  manuallyClosedDate,
  acceptsInstallments,
  logoUrl,
  logoBgColor,
}: {
  slug: string;
  products: CookieItem[];
  storeName: string;
  freeDeliveryThreshold: number;
  businessHours: BusinessHourDayDTO[];
  brandIcon?: string;
  manuallyClosedDate: string | null;
  acceptsInstallments: boolean;
  logoUrl: string | null;
  logoBgColor: string | null;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("todos");
  const [cartOpen, setCartOpen] = useState(false);
  const [hoursStatus, setHoursStatus] = useState<BusinessHoursStatus | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const router = useRouter();
  const storeIcon = useMemo(() => {
    const emoji = products[0]?.visual.emoji;
    if (emoji) {
      return (
        <span className="text-xl leading-none transition-transform duration-500 hover:rotate-12">
          {emoji}
        </span>
      );
    }
    return createElement(getStoreIcon(brandIcon), {
      className: "w-5 h-5 transition-transform duration-500 hover:rotate-12",
      style: { color: "var(--primary)" },
    });
  }, [brandIcon, products]);

  useEffect(() => {
    // Calculado no client (hora local do visitante convertida pro fuso da loja) de propósito,
    // pra não divergir do HTML gerado no servidor e causar mismatch de hidratação.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHoursStatus(getBusinessHoursStatus(businessHours, manuallyClosedDate));
  }, [businessHours, manuallyClosedDate]);

  const { cart, cartCount, cartTotal, delivery, orderTotal, addToCart, removeFromCart, deleteFromCart, clearCart } = useCart();

  const isManuallyClosedToday = !!hoursStatus?.isManuallyClosedToday;
  const isClosed = isManuallyClosedToday || (!!hoursStatus?.hasAnyHours && !hoursStatus.isOpenNow);

  const categories = useMemo(
    () => ["todos", ...Array.from(new Set(products.map((p) => p.category)))],
    [products]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(
      (c) =>
        (category === "todos" || c.category === category) &&
        (c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))
    );
  }, [products, search, category]);

  const getQty = (id: string) => cart.find((i) => i.id === id)?.quantity ?? 0;
  const horizontalCards = HORIZONTAL_CARD_LAYOUT_SLUGS.includes(slug);
  const shipsNationwide = NATIONWIDE_SHIPPING_SLUGS.includes(slug);

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">

      {/* ── Pattern: soft-corner-vignette (neutral, page-wide) ──────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: `
            radial-gradient(circle 700px at 0% 280px, rgba(0, 0, 0, 0.035), transparent),
            radial-gradient(circle 700px at 100% 280px, rgba(0, 0, 0, 0.025), transparent)
          `,
        }}
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href={`/${slug}`} className="flex items-center gap-2 shrink-0" aria-label={storeName}>
            {storeIcon}
            <span
              className="hidden sm:inline font-heading text-xl font-bold tracking-tight"
              style={{ color: isManuallyClosedToday ? "var(--destructive)" : "var(--primary)" }}
            >
              {storeName}
            </span>
          </Link>

          <div className="flex-1 max-w-lg mx-auto relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar produtos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-10 rounded-full bg-secondary border-0 text-sm focus-visible:ring-primary/40 transition-all"
            />
          </div>

          <a
            href={`/${slug}/pedidos`}
            className="hidden sm:flex items-center gap-2 rounded-full border border-border px-4 h-10 hover:bg-secondary hover:border-primary/30 transition-all"
          >
            <Receipt className="w-4 h-4 text-foreground" />
            <span className="font-heading text-sm font-semibold">Meus pedidos</span>
          </a>

          <button
            onClick={() => setCartOpen(true)}
            className="hidden sm:flex relative items-center gap-2 rounded-full border border-border px-4 h-10 hover:bg-secondary hover:border-primary/30 transition-all cursor-pointer"
            aria-label={`Carrinho com ${cartCount} itens`}
          >
            <ShoppingCart className="w-4 h-4 text-foreground" />
            <span className="font-heading text-sm font-semibold">
              Carrinho
            </span>
            {cartCount > 0 && (
              <Badge className="h-5 min-w-5 px-1.5 text-xs font-bold rounded-full absolute -top-1.5 -right-1.5 animate-badge-pop">
                {cartCount}
              </Badge>
            )}
          </button>
        </div>
      </header>

      {/* Floating cart button — mobile only */}
      <button
        onClick={() => setCartOpen(true)}
        className="sm:hidden fixed bottom-5 right-5 z-40 flex items-center justify-center w-14 h-14 rounded-full shadow-lg cursor-pointer active:scale-95 transition-transform"
        style={{ backgroundColor: "var(--primary)" }}
        aria-label={`Carrinho com ${cartCount} itens`}
      >
        <ShoppingCart className="w-6 h-6 text-white" />
        {cartCount > 0 && (
          <Badge className="h-5 min-w-5 px-1.5 text-xs font-bold rounded-full absolute -top-1 -right-1 animate-badge-pop">
            {cartCount}
          </Badge>
        )}
      </button>

      <section className="relative max-w-7xl mx-auto w-full px-4 sm:px-6 pt-8 pb-6 overflow-hidden">

        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1
              className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black leading-none tracking-tight text-foreground animate-slide-up"
              style={{ animationDelay: "0s" }}
            >
              {isManuallyClosedToday ? (
                <span style={{ color: "var(--destructive)" }}>{storeName}</span>
              ) : (
                storeName.split(" ").map((word, i, arr) => (
                  <span
                    key={i}
                    style={i === arr.length - 1 ? { color: "var(--primary)" } : undefined}
                  >
                    {word}
                    {i < arr.length - 1 ? " " : ""}
                  </span>
                ))
              )}
            </h1>

            <p
              className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed animate-slide-up"
              style={{ animationDelay: "0.1s" }}
            >
              Escolha os produtos e receba certinho no seu endereço.
            </p>
          </div>

          {logoUrl && !logoFailed && (
            <div
              className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl overflow-hidden shadow-sm animate-slide-up"
              style={{ animationDelay: "0.05s", backgroundColor: logoBgColor ?? "#ffffff" }}
            >
              <Image
                src={logoUrl}
                alt={storeName}
                fill
                sizes="96px"
                className="object-cover"
                onError={() => setLogoFailed(true)}
              />
            </div>
          )}
        </div>

        <div
          className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground animate-slide-up"
          style={{ animationDelay: "0.16s" }}
        >
          {hoursStatus?.hasAnyHours && (
            <span className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  backgroundColor: hoursStatus.isOpenNow ? "var(--primary)" : "var(--destructive)",
                }}
              />
              <span
                className="font-semibold"
                style={{ color: hoursStatus.isOpenNow ? "var(--primary)" : "var(--destructive)" }}
              >
                {hoursStatus.isOpenNow ? "Aberto agora" : "Fechado agora"}
              </span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="font-heading font-semibold text-foreground">
              {products.length}
            </span>{" "}
            produtos
          </span>
          <span className="w-px h-4 bg-border hidden sm:block" />
          <span className="hidden sm:block">Entrega grátis acima de {fmt(freeDeliveryThreshold)}</span>
          {shipsNationwide && (
            <>
              <span className="w-px h-4 bg-border hidden sm:block" />
              <span className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 shrink-0" style={{ color: "var(--primary)" }} />
                Enviamos para todo o Brasil
              </span>
            </>
          )}
        </div>
      </section>

      <section
        className="max-w-7xl mx-auto w-full pb-8 animate-slide-up"
        style={{ animationDelay: "0.3s" }}
      >
        <div className="relative">
          <div
            className="flex gap-2 overflow-x-auto px-4 sm:px-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`
                  shrink-0 px-4 py-2 rounded-full text-sm font-medium capitalize transition-all duration-200 cursor-pointer whitespace-nowrap
                  ${
                    category === cat
                      ? "text-white shadow-sm scale-105"
                      : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-border"
                  }
                `}
                style={category === cat ? { backgroundColor: "var(--primary)" } : {}}
              >
                {cat}
              </button>
            ))}
          </div>
          {/* Fade nas bordas indicando que há mais categorias pra rolar */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background to-transparent sm:hidden" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background to-transparent" />
        </div>
      </section>

      {/* ── Cookie grid ─────────────────────────────────────────────────────── */}
      <main className="relative flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 pb-16">

        {/* Pattern: dashed-grid-light (very subtle texture behind cards) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, #ddd6cc 1px, transparent 1px),
              linear-gradient(to bottom, #ddd6cc 1px, transparent 1px)
            `,
            backgroundSize: "20px 20px",
            maskImage: `
              repeating-linear-gradient(to right, black 0px, black 2px, transparent 2px, transparent 8px),
              repeating-linear-gradient(to bottom, black 0px, black 2px, transparent 2px, transparent 8px)
            `,
            WebkitMaskImage: `
              repeating-linear-gradient(to right, black 0px, black 2px, transparent 2px, transparent 8px),
              repeating-linear-gradient(to bottom, black 0px, black 2px, transparent 2px, transparent 8px)
            `,
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
            opacity: 0.5,
          }}
        />
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <span className="text-6xl animate-pulse-soft select-none">{getStoreEmoji(brandIcon)}</span>
            <h2 className="font-heading text-2xl font-bold text-foreground">
              Nenhum produto encontrado
            </h2>
            <p className="text-muted-foreground">Tente outro termo ou categoria.</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setCategory("todos");
              }}
              className="rounded-full mt-2"
            >
              Limpar filtros
            </Button>
          </div>
        ) : horizontalCards ? (
          <div className="flex flex-col divide-y divide-border">
            {filtered.map((cookie, index) => (
              <CookieCardHorizontal
                key={cookie.id}
                cookie={cookie}
                quantity={getQty(cookie.id)}
                index={index}
                onAdd={() => addToCart(cookie)}
                onRemove={() => removeFromCart(cookie.id)}
                disabled={isClosed || (cookie.stockQuantity !== null && cookie.stockQuantity <= 0)}
                acceptsInstallments={acceptsInstallments}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((cookie, index) => (
              <CookieCard
                key={cookie.id}
                cookie={cookie}
                quantity={getQty(cookie.id)}
                index={index}
                onAdd={() => addToCart(cookie)}
                onRemove={() => removeFromCart(cookie.id)}
                disabled={isClosed || (cookie.stockQuantity !== null && cookie.stockQuantity <= 0)}
                acceptsInstallments={acceptsInstallments}
              />
            ))}
          </div>
        )}
      </main>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[420px] flex flex-col p-0 gap-0 overflow-hidden">
          <SheetHeader className="px-6 pt-6 pb-4">
            <SheetTitle className="font-heading text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" style={{ color: "var(--primary)" }} />
              Carrinho
              {cartCount > 0 && (
                <span className="font-sans text-sm font-normal text-muted-foreground ml-1">
                  ({cartCount} {cartCount === 1 ? "item" : "itens"})
                </span>
              )}
            </SheetTitle>
          </SheetHeader>

          <Separator />

          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
              <span className="text-6xl animate-pulse-soft select-none">{getStoreEmoji(brandIcon)}</span>
              <h3 className="font-heading text-xl font-bold text-foreground">
                Carrinho vazio
              </h3>
              <p className="text-sm text-muted-foreground">
                Adicione produtos do catálogo para começar.
              </p>
              <Button
                variant="outline"
                className="rounded-full mt-2"
                onClick={() => setCartOpen(false)}
              >
                Ver catálogo
              </Button>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 min-h-0 px-6">
                <div className="divide-y divide-border">
                  {cart.map((entry) => (
                    <CartItemRow
                      key={entry.id}
                      entry={entry}
                      onAdd={() => addToCart(entry)}
                      onRemove={() => removeFromCart(entry.id)}
                      onDelete={() => deleteFromCart(entry.id)}
                    />
                  ))}
                </div>
              </ScrollArea>

              <div className="px-6 pb-6 pt-4 border-t border-border space-y-4 mt-auto">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      Subtotal ({cartCount} {cartCount === 1 ? "item" : "itens"})
                    </span>
                    <span>{fmt(cartTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Entrega</span>
                    <span className="font-semibold" style={{ color: "var(--primary)" }}>
                      {delivery === 0 ? "Grátis" : fmt(delivery)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-lg font-extrabold tracking-tight">
                      Total
                    </span>
                    <span
                      className="font-heading text-2xl font-black tracking-tight"
                      style={{ color: "var(--primary)" }}
                    >
                      {fmt(orderTotal)}
                    </span>
                  </div>
                  {delivery > 0 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      Faltam{" "}
                      <span className="font-semibold text-foreground">
                        {fmt(freeDeliveryThreshold - cartTotal)}
                      </span>{" "}
                      para entrega grátis
                    </p>
                  )}
                </div>

                {isClosed && (
                  <p className="text-center text-xs font-semibold text-destructive">
                    A loja está fechada no momento. Volte durante o horário de funcionamento
                    para finalizar seu pedido.
                  </p>
                )}

                <Button
                  className="w-full h-12 rounded-full font-heading text-base font-bold gap-2 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => { setCartOpen(false); router.push(`/${slug}/checkout`); }}
                  disabled={isClosed}
                >
                  Finalizar pedido
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <button
                  onClick={clearCart}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-1"
                >
                  Limpar carrinho
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
