"use client";

import { useEffect, useMemo, useState, useTransition, createElement } from "react";
import { ArrowLeft, Loader2, MapPin, Receipt, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatPhone } from "@/lib/phone";
import { lookupOrdersAction } from "@/app/[slug]/checkout/actions";
import { getStoreIcon } from "@/lib/store-icons";
import type { OrderDTO } from "@/lib/orders";
import { StoreLocationButton } from "@/components/store-location-modal";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PAYMENT_LABELS: Record<string, string> = {
  pix: "PIX",
  card: "Cartão",
  credit: "Cartão de crédito",
  cash: "Dinheiro na entrega",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CustomerOrders({
  storeId,
  storeName,
  brandIcon,
  slug,
}: {
  storeId: string;
  storeName: string;
  brandIcon?: string;
  slug: string;
}) {
  const storeIcon = useMemo(
    () => createElement(getStoreIcon(brandIcon), { className: "w-5 h-5", style: { color: "var(--primary)" } }),
    [brandIcon]
  );
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<OrderDTO[] | null>(null);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`checkout:${slug}`);
      if (!raw) return;
      const draft = JSON.parse(raw) as { phone?: string };
      if (draft.phone) setPhone(formatPhone(draft.phone));
    } catch {
      // localStorage indisponível ou draft inválido — segue sem pré-preencher
    }
  }, [slug]);

  const search = () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) return;
    startTransition(async () => {
      const result = await lookupOrdersAction(storeId, digits);
      setOrders(result);
      setSearched(true);
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-5 md:px-8 h-16 flex items-center gap-4">
          <a
            href={`/${slug}`}
            className="w-10 h-10 rounded-xl flex items-center justify-center border-2 border-border hover:border-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div className="flex items-center gap-2">
            {storeIcon}
            <span className="font-heading text-lg font-bold tracking-tight" style={{ color: "var(--primary)" }}>
              {storeName}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-5 md:px-8 py-8">
        <h1 className="font-heading text-4xl font-black tracking-tight leading-tight">Meus pedidos</h1>
        <p className="mt-2 text-muted-foreground">
          Informe o telefone usado no pedido para ver o histórico.
        </p>

        <div className="mt-6 flex gap-2">
          <Input
            placeholder="(85) 99999-9999"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && search()}
            maxLength={15}
            className="h-12 rounded-xl border-2 flex-1"
          />
          <button
            onClick={search}
            disabled={isPending || phone.replace(/\D/g, "").length < 10}
            className="h-12 px-5 rounded-xl font-heading font-bold text-sm border-2 border-foreground bg-foreground text-background cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Buscar
          </button>
        </div>

        {searched && orders !== null && (
          <div className="mt-8 flex flex-col gap-4">
            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <Receipt className="w-10 h-10 text-muted-foreground" />
                <p className="font-heading font-bold text-lg">Nenhum pedido encontrado</p>
                <p className="text-sm text-muted-foreground">
                  Confira se o telefone digitado é o mesmo usado no pedido.
                </p>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="bg-card border-2 border-border rounded-3xl overflow-hidden">
                  <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </span>
                    <span
                      className="font-heading text-lg font-black"
                      style={{ color: "var(--primary)" }}
                    >
                      {fmt(order.total)}
                    </span>
                  </div>
                  <div className="divide-y divide-border border-t border-border">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-5 py-2.5 text-sm">
                        <span>
                          {item.quantity}× {item.name}
                        </span>
                        <span className="font-semibold">{fmt(item.unitPrice * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border px-5 py-3 flex flex-col gap-1.5">
                    {order.address ? (
                      <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>
                          {order.address.street}, {order.address.number}, {order.address.neighborhood},{" "}
                          {order.address.city}/{order.address.state}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>Retirada no local</span>
                        </div>
                        <StoreLocationButton slug={slug} storeName={storeName} variant="link" />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Pagamento: {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
                      {order.paymentNote ? `, troco para ${order.paymentNote}` : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
