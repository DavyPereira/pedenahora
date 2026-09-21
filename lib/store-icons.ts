import {
  Cookie,
  Cake,
  Donut,
  IceCream2,
  Coffee,
  Croissant,
  Candy,
  Pizza,
  Sandwich,
  Gift,
  ShoppingBag,
  Store,
  Sparkles,
  Flower2,
  SprayCan,
  Gem,
  Package,
  Heart,
  PawPrint,
  Leaf,
  Citrus,
  type LucideIcon,
} from "lucide-react";

export const STORE_ICONS = {
  Cookie,
  Cake,
  Donut,
  IceCream2,
  Coffee,
  Croissant,
  Candy,
  Pizza,
  Sandwich,
  Gift,
  ShoppingBag,
  Store,
  Sparkles,
  Flower2,
  SprayCan,
  Gem,
  Package,
  Heart,
  PawPrint,
  Leaf,
  Citrus,
} satisfies Record<string, LucideIcon>;

export type StoreIconName = keyof typeof STORE_ICONS;

export const STORE_ICON_NAMES = Object.keys(STORE_ICONS) as StoreIconName[];

export const DEFAULT_STORE_ICON: StoreIconName = "Cookie";

export function getStoreIcon(name: string | null | undefined): LucideIcon {
  return STORE_ICONS[name as StoreIconName] ?? STORE_ICONS[DEFAULT_STORE_ICON];
}

export const STORE_ICON_EMOJI = {
  Cookie: "🍪",
  Cake: "🎂",
  Donut: "🍩",
  IceCream2: "🍦",
  Coffee: "☕",
  Croissant: "🥐",
  Candy: "🍬",
  Pizza: "🍕",
  Sandwich: "🥪",
  Gift: "🎁",
  ShoppingBag: "🛍️",
  Store: "🏬",
  Sparkles: "✨",
  Flower2: "🌸",
  SprayCan: "🧴",
  Gem: "💎",
  Package: "📦",
  Heart: "❤️",
  PawPrint: "🐾",
  Leaf: "🌿",
  Citrus: "🍊",
} satisfies Record<StoreIconName, string>;

export const STORE_ICON_EMOJI_PRESETS = {
  Cookie: ["🍪", "🍫", "🥜", "🍵", "🫐", "🌰", "🥥", "🌾", "❤️"],
  Cake: ["🎂", "🍰", "🧁", "🍫", "🍓", "🍒", "🥚", "🧈", "❤️"],
  Donut: ["🍩", "🍫", "🧁", "🍰", "🍓", "🍯", "☕", "🥛", "❤️"],
  IceCream2: ["🍦", "🍨", "🍧", "🍓", "🍫", "🥥", "🍒", "🍋", "❤️"],
  Coffee: ["☕", "🫘", "🍫", "🥐", "🧁", "🍪", "🥛", "🍯", "❤️"],
  Croissant: ["🥐", "🥖", "🍞", "🧈", "🍫", "☕", "🥛", "🍯", "❤️"],
  Candy: ["🍬", "🍭", "🍫", "🍡", "🍓", "🍇", "🍋", "🍒", "❤️"],
  Pizza: ["🍕", "🧀", "🍅", "🌶️", "🍄", "🫒", "🥓", "🌿", "❤️"],
  Sandwich: ["🥪", "🍞", "🧀", "🥓", "🥬", "🍅", "🥑", "🥚", "❤️"],
  Gift: ["🎁", "🎀", "✨", "🎉", "💝", "🎊", "🌟", "🕯️", "❤️"],
  ShoppingBag: ["🛍️", "👜", "👗", "👟", "💄", "🧢", "🕶️", "💍", "❤️"],
  Store: ["🏬", "🛒", "📦", "🏷️", "💳", "🛍️", "🔔", "⭐", "❤️"],
  Sparkles: ["✨", "🌟", "💫", "⭐", "🎇", "🎆", "🪄", "💖", "❤️"],
  Flower2: ["🌸", "🌺", "🌷", "🌹", "🌻", "🌼", "🍃", "💐", "❤️"],
  SprayCan: ["🧴", "🌸", "💐", "🌺", "✨", "💎", "🎀", "🍃", "❤️"],
  Gem: ["💎", "💍", "✨", "👑", "🌟", "🔮", "🪞", "💫", "❤️"],
  Package: ["📦", "🏷️", "🎁", "📮", "✉️", "🧾", "🛒", "📫", "❤️"],
  Heart: ["❤️", "💖", "💕", "💗", "💝", "🩷", "💫", "✨", "🌹"],
  PawPrint: ["🐾", "🐶", "🐱", "🦴", "🐟", "🥩", "🧡", "🏠", "❤️"],
  Leaf: ["🌿", "💪", "🥑", "🍃", "💊", "🥤", "🌱", "⚡", "❤️"],
  Citrus: ["🍓", "🍌", "🍇", "🍍", "🥝", "🍊", "🍒", "🥭", "❤️"],
} satisfies Record<StoreIconName, string[]>;

export function getStoreEmoji(name: string | null | undefined): string {
  return STORE_ICON_EMOJI[name as StoreIconName] ?? STORE_ICON_EMOJI[DEFAULT_STORE_ICON];
}

export function getStoreEmojiPresets(name: string | null | undefined): string[] {
  return STORE_ICON_EMOJI_PRESETS[name as StoreIconName] ?? STORE_ICON_EMOJI_PRESETS[DEFAULT_STORE_ICON];
}
