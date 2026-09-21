"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";
import type { StoreSettingsDTO } from "@/lib/types";
import { useLocalStorageState } from "@/lib/use-local-storage-state";
import { calcExtrasFee } from "@/lib/order-extras";

export type CookieItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  visual: { bg: string; emoji: string };
  imageUrl: string | null;
  cardPrice: number | null;
  stockQuantity: number | null;
};

export type CartEntry = CookieItem & { quantity: number; extras: string[] };

// Identifica uma linha do carrinho: mesmo produto com adicionais diferentes
// vira uma linha separada (não pode juntar a quantidade).
const entryKey = (id: string, extras: string[] | undefined) => `${id}::${[...(extras ?? [])].sort().join(",")}`;

type CartContextType = {
  cart: CartEntry[];
  cartCount: number;
  cartTotal: number;
  delivery: number;
  orderTotal: number;
  addToCart: (cookie: CookieItem, extras?: string[]) => void;
  removeFromCart: (id: string) => void;
  removeEntry: (entry: CartEntry) => void;
  deleteEntry: (entry: CartEntry) => void;
  deleteFromCart: (id: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({
  children,
  settings,
}: {
  children: ReactNode;
  settings: StoreSettingsDTO;
}) {
  const [rawCart, setCart] = useLocalStorageState<CartEntry[]>(`cart:${settings.slug}`, []);

  // Carrinhos salvos antes do suporte a adicionais não têm `extras` —
  // normaliza na leitura para não quebrar entry.extras.join(...) etc.
  const cart = useMemo(
    () => rawCart.map((i) => (i.extras ? i : { ...i, extras: [] })),
    [rawCart]
  );

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const delivery = !settings.acceptsDelivery
    ? 0
    : cartTotal === 0 || cartTotal >= settings.freeDeliveryThreshold
      ? 0
      : settings.deliveryFee;
  const orderTotal = cartTotal + delivery;

  const addToCart = (cookie: CookieItem, extras: string[] = []) => {
    setCart((prev) => {
      const totalForProduct = prev
        .filter((i) => i.id === cookie.id)
        .reduce((s, i) => s + i.quantity, 0);
      if (cookie.stockQuantity !== null && totalForProduct >= cookie.stockQuantity) return prev;

      const key = entryKey(cookie.id, extras);
      const existing = prev.find((i) => entryKey(i.id, i.extras) === key);
      if (existing) {
        return prev.map((i) =>
          entryKey(i.id, i.extras) === key ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      // A taxa dos adicionais acima do limite grátis é somada ao preço da
      // linha (e ao preço no cartão), pra entrar automaticamente em todo
      // cálculo de total sem precisar tratar isso em mais nenhum lugar.
      const fee = calcExtrasFee(extras.length);
      return [
        ...prev,
        {
          ...cookie,
          quantity: 1,
          extras,
          price: cookie.price + fee,
          cardPrice: cookie.cardPrice !== null ? cookie.cardPrice + fee : null,
        },
      ];
    });
  };

  // Decrementa a última linha adicionada desse produto (não distingue adicionais).
  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const lastIndex = prev.map((i) => i.id).lastIndexOf(id);
      if (lastIndex === -1) return prev;
      const item = prev[lastIndex];
      if (item.quantity === 1) return prev.filter((_, idx) => idx !== lastIndex);
      return prev.map((i, idx) => (idx === lastIndex ? { ...i, quantity: i.quantity - 1 } : i));
    });
  };

  // Decrementa uma linha específica (produto + adicionais), usada no carrinho.
  const removeEntry = (entry: CartEntry) => {
    setCart((prev) => {
      const key = entryKey(entry.id, entry.extras);
      const match = prev.find((i) => entryKey(i.id, i.extras) === key);
      if (!match) return prev;
      if (match.quantity === 1) return prev.filter((i) => entryKey(i.id, i.extras) !== key);
      return prev.map((i) =>
        entryKey(i.id, i.extras) === key ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  };

  const deleteEntry = (entry: CartEntry) => {
    const key = entryKey(entry.id, entry.extras);
    setCart((prev) => prev.filter((i) => entryKey(i.id, i.extras) !== key));
  };

  const deleteFromCart = (id: string) =>
    setCart((prev) => prev.filter((i) => i.id !== id));

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        cartTotal,
        delivery,
        orderTotal,
        addToCart,
        removeFromCart,
        removeEntry,
        deleteEntry,
        deleteFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
