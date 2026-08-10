"use client";

import { useEffect, useMemo, useState, useRef, useTransition, createElement } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  CreditCard,
  Banknote,
  QrCode,
  ChevronRight,
  Loader2,
  Check,
  Truck,
  AlertTriangle,
  Pencil,
  User,
  Plus,
  MapPinned,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/lib/cart-context";
import { ActionButton, FieldError, FieldLabel, inputClass } from "@/components/form-kit";
import { renderWhatsAppTemplate, truncateWhatsAppMessage } from "@/lib/whatsapp-template";
import { useLocalStorageState } from "@/lib/use-local-storage-state";
import { formatPhone } from "@/lib/phone";
import { lookupCustomerAction, submitOrderAction } from "@/app/[slug]/checkout/actions";
import { getStoreEmoji, getStoreIcon } from "@/lib/store-icons";
import type { CustomerLookupResult } from "@/lib/customers";
import type { StoreSettingsDTO, BusinessHourDayDTO } from "@/lib/types";
import type { CartEntry } from "@/lib/cart-context";
import { getBusinessHoursStatus, type BusinessHoursStatus } from "@/lib/business-hours-status";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtPct = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

const TOTAL_STEPS = 4;

type PaymentMethod = "pix" | "cash" | "card";
type DeliveryMethod = "delivery" | "pickup";
type Direction = "forward" | "back";

// Retirada na loja: por enquanto só a Lolo Cookies oferece essa opção, com endereço fixo.
const PICKUP_ENABLED_SLUGS = ["lolocookies"];
const PICKUP_ADDRESS = {
  street: "Rua Eufrásio Carneiro",
  number: "201",
  neighborhood: "Cruzeiro",
};
const PICKUP_ADDRESS_LINE = `${PICKUP_ADDRESS.street}, ${PICKUP_ADDRESS.number} - ${PICKUP_ADDRESS.neighborhood}`;

const addressSchema = z.object({
  cep: z
    .string()
    .min(1, "CEP é obrigatório para prosseguir")
    .regex(/^\d{5}-\d{3}$/, "CEP deve ter 8 dígitos"),
  street: z.string().trim().min(1, "Rua é obrigatória para prosseguir"),
  number: z
    .string()
    .min(1, "Número é obrigatório para prosseguir")
    .regex(/^\d+$/, "Número deve conter apenas dígitos"),
  complement: z.string(),
  neighborhood: z.string().trim().min(1, "Bairro é obrigatória para prosseguir"),
  city: z.string().trim().min(1, "Cidade é obrigatória para prosseguir"),
  state: z
    .string()
    .trim()
    .length(2, "UF é obrigatória para prosseguir")
    .regex(/^[A-Z]{2}$/, "UF inválida"),
});

type AddressForm = z.infer<typeof addressSchema>;

const identityFormSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(80, "Nome muito longo"),
  phone: z
    .string()
    .min(1, "Telefone é obrigatório")
    .regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, "Telefone deve ter DDD + número completo"),
});

type IdentityForm = z.infer<typeof identityFormSchema>;

const EMPTY_ADDRESS: AddressForm = {
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
};

type ViaCepResponse = {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
};

type CheckoutDraft = {
  step: number;
  name: string;
  phone: string;
  lookupResult: CustomerLookupResult | null;
  selectedAddressId: string | null;
  useNewAddress: boolean;
  address: AddressForm;
  deliveryMethod: DeliveryMethod;
  payment: PaymentMethod;
  change: string;
  installments: number;
};

const INITIAL_DRAFT: CheckoutDraft = {
  step: 1,
  name: "",
  phone: "",
  lookupResult: null,
  selectedAddressId: null,
  useNewAddress: false,
  address: EMPTY_ADDRESS,
  deliveryMethod: "delivery",
  payment: "pix",
  change: "",
  installments: 1,
};

const MAX_INSTALLMENTS = 12;
const FREE_INSTALLMENTS = 3;
// Percentual de juros total (não ao mês) sobre o valor financiado, por número de parcelas.
// Até 3x não tem juros; a partir de 4x a taxa sobe de forma escalonada.
const INSTALLMENT_INTEREST_PCT: Record<number, number> = {
  1: 0, 2: 0, 3: 0,
  4: 6.85, 5: 7.57, 6: 8.29, 7: 9.01, 8: 9.73, 9: 10.45, 10: 11.17, 11: 11.89, 12: 12.61,
};

const PAYMENT_OPTIONS: {
  id: PaymentMethod;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "pix",
    label: "PIX",
    description: "Aprovação imediata",
    icon: <QrCode className="w-7 h-7" />,
  },
  {
    id: "cash",
    label: "Dinheiro na entrega",
    description: "Pague ao receber",
    icon: <Banknote className="w-7 h-7" />,
  },
  {
    id: "card",
    label: "Cartão",
    description: "Pague ao receber",
    icon: <CreditCard className="w-7 h-7" />,
  },
];

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.112 1.524 5.84L.057 23.486a.75.75 0 0 0 .918.919l5.725-1.498A11.952 11.952 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.737 9.737 0 0 1-4.964-1.355l-.355-.212-3.698.968.985-3.6-.232-.371A9.738 9.738 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" />
    </svg>
  );
}

export function Checkout({
  settings,
  slug,
  businessHours,
}: {
  settings: StoreSettingsDTO;
  slug: string;
  businessHours: BusinessHourDayDTO[];
}) {
  const router = useRouter();
  const { cart, cartCount, cartTotal, delivery, orderTotal, clearCart } = useCart();
  const { storeName, brandIcon, whatsappNumber, whatsappMessageTemplate, freeDeliveryThreshold, deliveryFee, pixKey, acceptsPix, acceptsCash, acceptsCard, acceptsInstallments, acceptsDelivery } = settings;

  const STEP_SEQUENCE = acceptsDelivery ? [1, 2, 3, 4] : [1, 3, 4];
  const nextStepFrom = (current: number) => STEP_SEQUENCE[STEP_SEQUENCE.indexOf(current) + 1] ?? current;
  const prevStepFrom = (current: number) => STEP_SEQUENCE[STEP_SEQUENCE.indexOf(current) - 1] ?? current;

  const availablePaymentOptions = useMemo(
    () =>
      PAYMENT_OPTIONS.filter(
        (opt) =>
          (opt.id === "pix" && acceptsPix) ||
          (opt.id === "cash" && acceptsCash) ||
          (opt.id === "card" && acceptsCard)
      ),
    [acceptsPix, acceptsCash, acceptsCard]
  );

  const [hoursStatus, setHoursStatus] = useState<BusinessHoursStatus | null>(null);
  useEffect(() => {
    // Calculado no client (hora local convertida pro fuso da loja) de propósito, pra não
    // divergir do HTML gerado no servidor e causar mismatch de hidratação — mesmo padrão
    // usado no catálogo (components/catalog.tsx).
    setHoursStatus(getBusinessHoursStatus(businessHours, settings.manuallyClosedDate));
  }, [businessHours, settings.manuallyClosedDate]);
  const isClosed = !!hoursStatus?.isManuallyClosedToday || (!!hoursStatus?.hasAnyHours && !hoursStatus.isOpenNow);

  const [draft, setDraft] = useLocalStorageState<CheckoutDraft>(`checkout:${slug}`, INITIAL_DRAFT);

  const [step, setStep] = useState(() => draft.step);
  const directionRef = useRef<Direction>("forward");

  const [lookupResult, setLookupResult] = useState<CustomerLookupResult | null>(() => draft.lookupResult);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(() => draft.selectedAddressId);
  const [useNewAddress, setUseNewAddress] = useState(() => draft.useNewAddress);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [saving, startSaving] = useTransition();

  const pickupAvailable = PICKUP_ENABLED_SLUGS.includes(slug);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(() => draft.deliveryMethod ?? "delivery");
  const isPickup = pickupAvailable && deliveryMethod === "pickup";

  const {
    control: identityControl,
    handleSubmit: handleIdentitySubmit,
    setValue: setIdentityValue,
    formState: { errors: identityErrors },
  } = useForm<IdentityForm>({
    resolver: zodResolver(identityFormSchema),
    defaultValues: { name: draft.name, phone: draft.phone ? formatPhone(draft.phone) : "" },
  });
  const identity = useWatch({ control: identityControl }) as IdentityForm;
  const [identityAttempted, setIdentityAttempted] = useState(false);

  const {
    control: addressControl,
    handleSubmit: handleAddressSubmit,
    setValue: setAddressValue,
    formState: { errors: addressErrors },
  } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: draft.address,
  });
  const address = useWatch({ control: addressControl }) as AddressForm;
  const [addressAttempted, setAddressAttempted] = useState(false);

  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>(() => draft.payment);
  const [change, setChange] = useState(() => draft.change);
  const [installments, setInstallments] = useState(() => draft.installments || 1);
  const [sent, setSent] = useState(false);
  const [sentSummary, setSentSummary] = useState<{
    cart: CartEntry[];
    cartTotal: number;
    delivery: number;
    orderTotal: number;
    installments: number;
    installmentPct: number;
    cardAdjusted: boolean;
    isPickup: boolean;
  } | null>(null);

  useEffect(() => {
    if (availablePaymentOptions.length === 0) return;
    if (!availablePaymentOptions.some((opt) => opt.id === payment)) {
      setPayment(availablePaymentOptions[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availablePaymentOptions]);

  const isCardAdjusted = payment === "card" && acceptsInstallments;
  // Até FREE_INSTALLMENTS (3x) o cliente paga o preço normal, sem nenhum acréscimo — o
  // "preço no cartão" (com os juros escalonados) só entra em jogo a partir de 4x.
  const usesCardPricing = isCardAdjusted && installments > FREE_INSTALLMENTS;
  const installmentPct = usesCardPricing ? INSTALLMENT_INTEREST_PCT[installments] ?? 0 : 0;
  const installmentMultiplier = 1 + installmentPct / 100;
  const priceForEntry = (entry: CartEntry) =>
    usesCardPricing ? (entry.cardPrice ?? entry.price) * installmentMultiplier : entry.price;
  const cartTotalForPayment = cart.reduce((s, e) => s + priceForEntry(e) * e.quantity, 0);
  const effectiveDelivery = isPickup ? 0 : delivery;
  const orderTotalForPayment = cartTotalForPayment + effectiveDelivery;

  const basePriceCartTotal = cart.reduce((s, e) => s + e.price * e.quantity, 0);
  const baseCardCartTotal = cart.reduce((s, e) => s + (e.cardPrice ?? e.price) * e.quantity, 0);
  const totalForInstallments = (n: number) => {
    if (n <= FREE_INSTALLMENTS) return basePriceCartTotal + effectiveDelivery;
    const pct = INSTALLMENT_INTEREST_PCT[n] ?? 0;
    return baseCardCartTotal * (1 + pct / 100) + effectiveDelivery;
  };

  const displayCart = sentSummary?.cart ?? cart.map((e) => ({ ...e, price: priceForEntry(e) }));
  const displayCartCount = displayCart.reduce((s, i) => s + i.quantity, 0);
  const displayCartTotal = sentSummary?.cartTotal ?? cartTotalForPayment;
  const displayDelivery = sentSummary?.delivery ?? effectiveDelivery;
  const displayOrderTotal = sentSummary?.orderTotal ?? orderTotalForPayment;
  const displayInstallments = sentSummary?.installments ?? installments;
  const displayInstallmentPct = sentSummary?.installmentPct ?? installmentPct;
  const displayInstallmentValue = displayOrderTotal / displayInstallments;
  const displayCardAdjusted = sentSummary?.cardAdjusted ?? isCardAdjusted;
  const displayIsPickup = sentSummary?.isPickup ?? isPickup;

  useEffect(() => {
    setDraft({
      step,
      name: identity.name ?? "",
      phone: (identity.phone ?? "").replace(/\D/g, ""),
      lookupResult,
      selectedAddressId,
      useNewAddress,
      address,
      deliveryMethod,
      payment,
      change,
      installments,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, identity.name, identity.phone, lookupResult, selectedAddressId, useNewAddress, address, deliveryMethod, payment, change, installments]);

  const effectiveAddress: AddressForm =
    selectedAddressId && lookupResult
      ? lookupResult.addresses.find((a) => a.id === selectedAddressId) ?? address
      : address;

  const showAddressList = !!lookupResult && lookupResult.addresses.length > 0 && !useNewAddress;

  const goTo = (target: number) => {
    directionRef.current = target > step ? "forward" : "back";
    setStep(target);
  };

  const setField = (field: keyof AddressForm, value: string) =>
    setAddressValue(field, value, { shouldValidate: addressAttempted });

  const onIdentityContinue = () =>
    handleIdentitySubmit(
      (data) => {
        const phoneDigits = data.phone.replace(/\D/g, "");
        setIsLookingUp(true);
        startSaving(async () => {
          const result = await lookupCustomerAction(settings.id, phoneDigits);
          setLookupResult(result);
          setUseNewAddress(!result || result.addresses.length === 0);
          setSelectedAddressId(null);
          setIsLookingUp(false);
          goTo(nextStepFrom(1));
        });
      },
      () => setIdentityAttempted(true)
    )();

  const onAddressContinue = () =>
    handleAddressSubmit(
      () => goTo(3),
      () => setAddressAttempted(true)
    )();

  const onSavedAddressContinue = () => {
    if (!selectedAddressId) return;
    goTo(3);
  };

  const lookupCep = async () => {
    const clean = address.cep.replace(/\D/g, "");
    if (clean.length !== 8) { setCepError("CEP deve ter 8 dígitos"); return; }
    setCepLoading(true);
    setCepError("");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data: ViaCepResponse = await res.json();
      if (data.erro) { setCepError("CEP não encontrado"); return; }
      setField("street", data.logradouro);
      setField("neighborhood", data.bairro);
      setField("city", data.localidade);
      setField("state", data.uf);
    } catch {
      setCepError("Erro ao buscar CEP. Tente novamente.");
    } finally {
      setCepLoading(false);
    }
  };

  const handleCepChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    setField("cep", formatted);
    setCepError("");
  };

  const handleNumberChange = (value: string) => {
    setField("number", value.replace(/\D/g, "").slice(0, 6));
  };

  const handleCityChange = (value: string) => {
    setField("city", value.replace(/[0-9]/g, ""));
  };

  const handleStateChange = (value: string) => {
    setField("state", value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2));
  };

  const handlePhoneChange = (value: string) => {
    setIdentityValue("phone", formatPhone(value), { shouldValidate: identityAttempted });
  };

  const buildMessage = () => {
    const itens = cart
      .map((entry) => `• ${entry.quantity}× ${entry.name}: ${fmt(priceForEntry(entry) * entry.quantity)}`)
      .join("\n");

    const paymentLabels: Record<PaymentMethod, string> = {
      pix: pixKey.trim() ? `PIX (Chave: ${pixKey.trim()})` : "PIX",
      cash: change.trim() ? `Dinheiro na entrega, troco para ${change}` : "Dinheiro na entrega",
      card: isCardAdjusted
        ? `Cartão, ${installments}x de ${fmt(orderTotalForPayment / installments)}${installmentPct > 0 ? ` (juros de ${fmtPct(installmentPct)})` : " sem juros"}`
        : "Cartão",
    };

    const endereco = isPickup
      ? [`Retirada no local`, PICKUP_ADDRESS_LINE].join("\n")
      : acceptsDelivery
        ? [
            `${effectiveAddress.street}, ${effectiveAddress.number}${effectiveAddress.complement ? `, ${effectiveAddress.complement}` : ""}`,
            effectiveAddress.neighborhood,
            `${effectiveAddress.city}/${effectiveAddress.state}`,
            `CEP: ${effectiveAddress.cep}`,
          ].join("\n")
        : "Retirada no local";

    const message = renderWhatsAppTemplate(whatsappMessageTemplate, {
      loja: storeName,
      itens,
      subtotal: fmt(cartTotalForPayment),
      entrega: isPickup ? "Retirada no local" : acceptsDelivery ? (effectiveDelivery === 0 ? "Grátis 🎉" : fmt(effectiveDelivery)) : "Retirada no local",
      total: fmt(orderTotalForPayment),
      pagamento: paymentLabels[payment],
      endereco,
    });

    return truncateWhatsAppMessage(message);
  };

  const [blockedClosed, setBlockedClosed] = useState(false);
  const [blockedOutOfStock, setBlockedOutOfStock] = useState(false);

  const handleSendWhatsApp = () => {
    if (sent) return;
    const message = buildMessage();
    // Precisa abrir a aba de forma síncrona, dentro do clique do usuário.
    // Se abrirmos depois do `await submitOrderAction`, o navegador não reconhece
    // mais como ação do usuário e bloqueia o popup — foi o que causava o botão
    // dizer "enviado" sem o WhatsApp realmente abrir.
    const whatsappWindow = window.open("", "_blank");
    startSaving(async () => {
      let result: { ok: boolean; reason?: "closed" | "invalid" | "out_of_stock" } = { ok: true };
      try {
        result = await submitOrderAction({
          storeId: settings.id,
          name: identity.name ?? "",
          phone: (identity.phone ?? "").replace(/\D/g, ""),
          address: acceptsDelivery && !isPickup ? effectiveAddress : undefined,
          saveNewAddress: acceptsDelivery && !isPickup && !selectedAddressId ? address : undefined,
          items: cart.map((entry) => ({
            name: entry.name,
            quantity: entry.quantity,
            unitPrice: priceForEntry(entry),
          })),
          stockItems: cart.map((entry) => ({ productId: entry.id, quantity: entry.quantity })),
          subtotal: cartTotalForPayment,
          deliveryFee: effectiveDelivery,
          total: orderTotalForPayment,
          paymentMethod: payment,
          paymentNote: payment === "cash" && change.trim() ? change.trim() : undefined,
        });
      } catch {
        // Falha de rede/infra ao salvar o pedido é conveniência (histórico do cliente) —
        // não deve impedir o envio pelo WhatsApp. Só os motivos "closed" (loja fechada) e
        // "out_of_stock" (estoque insuficiente), validados no servidor, bloqueiam o envio.
      }

      if (!result.ok && result.reason === "closed") {
        whatsappWindow?.close();
        setBlockedClosed(true);
        return;
      }

      if (!result.ok && result.reason === "out_of_stock") {
        whatsappWindow?.close();
        setBlockedOutOfStock(true);
        return;
      }

      const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      if (whatsappWindow) {
        whatsappWindow.location.href = url;
      } else {
        window.open(url, "_blank");
      }
      setSentSummary({
        cart: cart.map((entry) => ({ ...entry, price: priceForEntry(entry) })),
        cartTotal: cartTotalForPayment,
        delivery: effectiveDelivery,
        orderTotal: orderTotalForPayment,
        installments,
        installmentPct,
        cardAdjusted: isCardAdjusted,
        isPickup,
      });
      clearCart();
      setSent(true);
      // Pedido enviado: se o cliente pedir de novo sem recarregar a página, o próximo
      // checkout deve abrir direto no endereço (step 2), mantendo nome e telefone.
      setDraft({
        ...INITIAL_DRAFT,
        step: 2,
        name: identity.name ?? "",
        phone: (identity.phone ?? "").replace(/\D/g, ""),
        lookupResult,
      });
    });
  };

  const handleBackToCatalog = () => {
    router.push(`/${slug}`);
  };

  const animClass = directionRef.current === "forward" ? "animate-step-forward" : "animate-step-back";
  const stepIndex = STEP_SEQUENCE.indexOf(step);
  const totalStepsForDisplay = STEP_SEQUENCE.length;

  // ── Loja fechada ───────────────────────────────────────────────────────────
  if (!sent && (isClosed || blockedClosed)) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <CheckoutHeader step={0} totalSteps={TOTAL_STEPS} storeName={storeName} brandIcon={brandIcon} slug={slug} onBack={() => router.back()} />
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center">
          <span className="text-7xl select-none">🔒</span>
          <h2 className="font-heading text-3xl font-black">Loja fechada no momento</h2>
          <p className="text-muted-foreground max-w-sm">
            Não estamos aceitando pedidos fora do horário de funcionamento. Volte mais tarde
            para finalizar sua compra.
          </p>
          <ActionButton color="var(--primary)" onClick={() => router.push(`/${slug}`)}>Voltar ao catálogo</ActionButton>
        </div>
      </div>
    );
  }

  // ── Estoque esgotado ───────────────────────────────────────────────────────
  if (!sent && blockedOutOfStock) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <CheckoutHeader step={0} totalSteps={TOTAL_STEPS} storeName={storeName} brandIcon={brandIcon} slug={slug} onBack={() => router.back()} />
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center">
          <span className="text-7xl select-none">😔</span>
          <h2 className="font-heading text-3xl font-black">Ops, esgotou!</h2>
          <p className="text-muted-foreground max-w-sm">
            Um dos itens do seu carrinho esgotou enquanto você finalizava o pedido. Volte ao
            carrinho e ajuste a quantidade para continuar.
          </p>
          <ActionButton color="var(--primary)" onClick={() => router.push(`/${slug}`)}>Voltar ao catálogo</ActionButton>
        </div>
      </div>
    );
  }

  // ── Empty cart ──────────────────────────────────────────────────────────────
  if (!sent && cart.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <CheckoutHeader step={0} totalSteps={TOTAL_STEPS} storeName={storeName} brandIcon={brandIcon} slug={slug} onBack={() => router.back()} />
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center">
          <span className="text-7xl select-none">{getStoreEmoji(brandIcon)}</span>
          <h2 className="font-heading text-3xl font-black">Carrinho vazio</h2>
          <p className="text-muted-foreground">Adicione produtos antes de finalizar.</p>
          <ActionButton color="var(--primary)" onClick={() => router.push(`/${slug}`)}>Ver catálogo</ActionButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CheckoutHeader
        step={stepIndex + 1}
        totalSteps={totalStepsForDisplay}
        storeName={storeName}
        brandIcon={brandIcon}
        slug={slug}
        onBack={step > 1 ? () => goTo(prevStepFrom(step)) : () => router.back()}
      />

      {/* Progress bar */}
      <div className="w-full max-w-md sm:max-w-xl md:max-w-2xl mx-auto px-5 pt-4">
        <div className="h-2 rounded-full bg-border w-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((stepIndex + 1) / totalStepsForDisplay) * 100}%`, backgroundColor: "var(--primary)" }}
          />
        </div>
      </div>

      <main className="flex-1 w-full max-w-md sm:max-w-xl md:max-w-2xl mx-auto px-5 md:px-8 py-8 overflow-y-auto relative">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-2 right-2 text-4xl opacity-10 select-none rotate-12 hidden md:inline"
        >
          {getStoreEmoji(brandIcon)}
        </span>

        {/* ── Step 1: Identificação ─────────────────────────────────────────── */}
        {step === 1 && (
          <div key="step-1" className={animClass}>
            <StepTitle
              title="Quem está pedindo?"
              subtitle="Informe seu nome e telefone para continuarmos."
            />

            <div className="mt-6 flex flex-col gap-3">
              <div>
                <FieldLabel>Nome</FieldLabel>
                <Input
                  placeholder="Seu nome completo"
                  value={identity.name ?? ""}
                  onChange={(e) => setIdentityValue("name", e.target.value, { shouldValidate: identityAttempted })}
                  className={inputClass(!!identityErrors.name)}
                />
                <FieldError>{identityErrors.name?.message}</FieldError>
              </div>
              <div>
                <FieldLabel>Telefone / WhatsApp</FieldLabel>
                <Input
                  placeholder="(85) 99999-9999"
                  inputMode="numeric"
                  value={identity.phone ?? ""}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={inputClass(!!identityErrors.phone)}
                  maxLength={15}
                />
                <FieldError>{identityErrors.phone?.message}</FieldError>
              </div>
            </div>

            <div className="mt-8">
              <ActionButton color="var(--primary)" onClick={onIdentityContinue} disabled={isLookingUp}>
                {isLookingUp ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Continuar <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </ActionButton>
              {identityAttempted && Object.keys(identityErrors).length > 0 && (
                <p className="text-center text-xs font-medium text-destructive mt-3">
                  Preencha todos os campos corretamente
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: Endereço ──────────────────────────────────────────────── */}
        {step === 2 && acceptsDelivery && (
          <div key="step-2" className={animClass}>
            <StepTitle
              title={isPickup ? "Retirar na loja" : "Onde entregamos?"}
              subtitle={
                isPickup
                  ? "Confira o endereço para retirada do seu pedido."
                  : showAddressList
                    ? "Escolha um endereço salvo ou cadastre um novo."
                    : "Informe seu endereço para calcularmos o frete."
              }
            />

            {pickupAvailable && (
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDeliveryMethod("delivery")}
                  className="relative w-full p-4 rounded-2xl border-2 flex flex-col items-center gap-2 text-center transition-all duration-200 cursor-pointer active:scale-[0.98]"
                  style={
                    !isPickup
                      ? { backgroundColor: "var(--primary)", borderColor: "var(--primary)" }
                      : { borderColor: "var(--border)", backgroundColor: "var(--card)" }
                  }
                >
                  <Truck className="w-5 h-5" style={{ color: !isPickup ? "white" : "var(--muted-foreground)" }} />
                  <span
                    className="font-heading font-bold text-sm"
                    style={{ color: !isPickup ? "white" : "var(--foreground)" }}
                  >
                    Entrega
                  </span>
                </button>
                <button
                  onClick={() => setDeliveryMethod("pickup")}
                  className="relative w-full p-4 rounded-2xl border-2 flex flex-col items-center gap-2 text-center transition-all duration-200 cursor-pointer active:scale-[0.98]"
                  style={
                    isPickup
                      ? { backgroundColor: "var(--primary)", borderColor: "var(--primary)" }
                      : { borderColor: "var(--border)", backgroundColor: "var(--card)" }
                  }
                >
                  <MapPinned className="w-5 h-5" style={{ color: isPickup ? "white" : "var(--muted-foreground)" }} />
                  <span
                    className="font-heading font-bold text-sm"
                    style={{ color: isPickup ? "white" : "var(--foreground)" }}
                  >
                    Retirar na loja
                  </span>
                </button>
              </div>
            )}

            {isPickup ? (
              <>
                <div
                  className="mt-6 rounded-3xl p-5"
                  style={{ backgroundColor: "color-mix(in oklch, var(--primary) 12%, var(--card))" }}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "var(--primary)" }}
                    >
                      <MapPinned className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-heading font-bold text-sm">Endereço para retirada</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {PICKUP_ADDRESS_LINE}
                  </p>
                  <p className="mt-2 text-sm font-bold" style={{ color: "var(--primary)" }}>
                    ✓ Sem taxa de entrega
                  </p>
                </div>

                <div className="mt-8">
                  <ActionButton color="var(--primary)" onClick={() => goTo(3)}>
                    Continuar <ArrowRight className="w-4 h-4" />
                  </ActionButton>
                </div>
              </>
            ) : (
              <>
            {/* Delivery fee card */}
            <div
              className="mt-6 rounded-3xl p-5"
              style={{ backgroundColor: "color-mix(in oklch, var(--primary) 12%, var(--card))" }}
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  <Truck className="w-4 h-4 text-white" />
                </div>
                <span className="font-heading font-bold text-sm">Taxa de entrega</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Grátis para pedidos acima de <strong className="text-foreground">{fmt(freeDeliveryThreshold)}</strong>.
                Abaixo disso, <strong className="text-foreground">{fmt(deliveryFee)}</strong>.
              </p>
              {cartTotal >= freeDeliveryThreshold ? (
                <p className="mt-2 text-sm font-bold" style={{ color: "var(--primary)" }}>
                  ✓ Seu pedido já tem entrega grátis!
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Faltam <strong className="text-foreground">{fmt(freeDeliveryThreshold - cartTotal)}</strong> para entrega grátis.
                </p>
              )}
            </div>

            {showAddressList ? (
              <>
                <div className="mt-6 flex flex-col gap-3">
                  {lookupResult!.addresses.map((addr) => {
                    const selected = selectedAddressId === addr.id;
                    return (
                      <button
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className="relative w-full p-4 rounded-2xl border-2 flex items-start gap-3 text-left transition-all duration-200 cursor-pointer active:scale-[0.98]"
                        style={
                          selected
                            ? { backgroundColor: "var(--primary)", borderColor: "var(--primary)" }
                            : { borderColor: "var(--border)", backgroundColor: "var(--card)" }
                        }
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={
                            selected
                              ? { backgroundColor: "rgba(255,255,255,0.18)", color: "white" }
                              : { backgroundColor: "var(--secondary)", color: "var(--muted-foreground)" }
                          }
                        >
                          <MapPinned className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="font-heading font-bold text-sm"
                            style={{ color: selected ? "white" : "var(--foreground)" }}
                          >
                            {addr.street}, {addr.number}
                          </p>
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: selected ? "rgba(255,255,255,0.8)" : "var(--muted-foreground)" }}
                          >
                            {addr.neighborhood}, {addr.city}/{addr.state}
                          </p>
                        </div>
                        <div
                          className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                          style={
                            selected
                              ? { borderColor: "white", backgroundColor: "white" }
                              : { borderColor: "var(--border)" }
                          }
                        >
                          {selected && (
                            <Check className="w-3 h-3 stroke-[3]" style={{ color: "var(--primary)" }} />
                          )}
                        </div>
                      </button>
                    );
                  })}

                  <button
                    onClick={() => {
                      setUseNewAddress(true);
                      setSelectedAddressId(null);
                    }}
                    className="w-full p-4 rounded-2xl border-2 border-dashed border-border flex items-center gap-3 text-left transition-colors hover:border-foreground cursor-pointer"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "var(--secondary)", color: "var(--muted-foreground)" }}
                    >
                      <Plus className="w-4 h-4" />
                    </div>
                    <span className="font-heading font-bold text-sm">Cadastrar novo endereço</span>
                  </button>
                </div>

                <div className="mt-8">
                  <ActionButton color="var(--primary)" onClick={onSavedAddressContinue} disabled={!selectedAddressId}>
                    Continuar <ArrowRight className="w-4 h-4" />
                  </ActionButton>
                  {!selectedAddressId && (
                    <p className="text-center text-xs font-medium text-muted-foreground mt-3">
                      Escolha um endereço para continuar
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                {!!lookupResult && lookupResult.addresses.length > 0 && (
                  <button
                    onClick={() => setUseNewAddress(false)}
                    className="mt-4 text-sm font-semibold text-foreground hover:underline cursor-pointer"
                  >
                    ← Usar um endereço salvo
                  </button>
                )}

                {/* CEP */}
                <div className="mt-6">
                  <FieldLabel>CEP</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      placeholder="00000-000"
                      value={address.cep}
                      onChange={(e) => handleCepChange(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && lookupCep()}
                      className={inputClass(
                        !!cepError || !!addressErrors.cep,
                        "rounded-xl h-12 px-4 py-0 leading-[2.75rem] flex-1 border-2 focus-visible:ring-0 focus-visible:border-foreground transition-colors"
                      )}
                      maxLength={9}
                    />
                    <button
                      onClick={lookupCep}
                      disabled={cepLoading}
                      className="h-12 px-5 rounded-xl font-heading font-bold text-sm border-2 border-foreground bg-foreground text-background cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40 shrink-0 flex items-center justify-center gap-2"
                    >
                      {cepLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Buscar <ChevronRight className="w-4 h-4" /></>}
                    </button>
                  </div>
                  <FieldError>{cepError || addressErrors.cep?.message}</FieldError>
                </div>

                {/* Address fields */}
                <div className="mt-3 flex flex-col gap-3">
                  <div className="grid grid-cols-[1fr_100px] gap-2">
                    <div>
                      <FieldLabel>Rua / Avenida</FieldLabel>
                      <Input
                        placeholder="Nome da rua"
                        value={address.street}
                        onChange={(e) => setField("street", e.target.value)}
                        className={inputClass(!!addressErrors.street)}
                      />
                      <FieldError>{addressErrors.street?.message}</FieldError>
                    </div>
                    <div>
                      <FieldLabel>Número</FieldLabel>
                      <Input
                        placeholder="123"
                        inputMode="numeric"
                        value={address.number}
                        onChange={(e) => handleNumberChange(e.target.value)}
                        className={inputClass(!!addressErrors.number)}
                        maxLength={6}
                      />
                      <FieldError>{addressErrors.number?.message}</FieldError>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Complemento <span className="normal-case font-normal tracking-normal">(opcional)</span></FieldLabel>
                      <Input
                        placeholder="Apto, bloco, referência..."
                        value={address.complement}
                        onChange={(e) => setField("complement", e.target.value)}
                        className={inputClass(false)}
                      />
                    </div>

                    <div>
                      <FieldLabel>Bairro</FieldLabel>
                      <Input
                        placeholder="Seu bairro"
                        value={address.neighborhood}
                        onChange={(e) => setField("neighborhood", e.target.value)}
                        className={inputClass(!!addressErrors.neighborhood)}
                      />
                      <FieldError>{addressErrors.neighborhood?.message}</FieldError>
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_80px] gap-2">
                    <div>
                      <FieldLabel>Cidade</FieldLabel>
                      <Input
                        placeholder="Cidade"
                        value={address.city}
                        onChange={(e) => handleCityChange(e.target.value)}
                        className={inputClass(!!addressErrors.city)}
                      />
                      <FieldError>{addressErrors.city?.message}</FieldError>
                    </div>
                    <div>
                      <FieldLabel>UF</FieldLabel>
                      <Input
                        placeholder="CE"
                        value={address.state}
                        onChange={(e) => handleStateChange(e.target.value)}
                        className={inputClass(!!addressErrors.state)}
                        maxLength={2}
                      />
                      <FieldError>{addressErrors.state?.message}</FieldError>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <ActionButton color="var(--primary)" onClick={onAddressContinue}>
                    Continuar <ArrowRight className="w-4 h-4" />
                  </ActionButton>
                  {addressAttempted && Object.keys(addressErrors).length > 0 && (
                    <p className="text-center text-xs font-medium text-destructive mt-3">
                      Preencha todos os campos obrigatórios
                    </p>
                  )}
                </div>
              </>
            )}
              </>
            )}
          </div>
        )}

        {/* ── Step 3: Pagamento ─────────────────────────────────────────────── */}
        {step === 3 && (
          <div key="step-3" className={animClass}>
            <StepTitle
              title="Como vai pagar?"
              subtitle="Escolha a forma de pagamento."
            />

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
              {availablePaymentOptions.map((opt) => {
                const selected = payment === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setPayment(opt.id)}
                    className="relative w-full p-5 rounded-2xl border-2 flex items-center gap-5 md:flex-col md:items-start md:gap-4 text-left transition-all duration-200 cursor-pointer active:scale-[0.98]"
                    style={
                      selected
                        ? { backgroundColor: "var(--primary)", borderColor: "var(--primary)" }
                        : { borderColor: "var(--border)", backgroundColor: "var(--card)" }
                    }
                  >
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                      style={
                        selected
                          ? { backgroundColor: "rgba(255,255,255,0.18)", color: "white" }
                          : { backgroundColor: "var(--secondary)", color: "var(--muted-foreground)" }
                      }
                    >
                      {opt.icon}
                    </div>
                    <div className="flex-1 md:w-full">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="font-heading text-xl font-bold"
                          style={{ color: selected ? "white" : "var(--foreground)" }}
                        >
                          {opt.label}
                        </span>
                      </div>
                    </div>
                    <div
                      className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 absolute top-4 right-4"
                      style={
                        selected
                          ? { borderColor: "white", backgroundColor: "white" }
                          : { borderColor: "var(--border)" }
                      }
                    >
                      {selected && (
                        <Check className="w-3.5 h-3.5 stroke-[3]" style={{ color: "var(--primary)" }} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {payment === "cash" && (
              <div className="mt-6 bg-card rounded-3xl p-5 border-2 border-border">
                <FieldLabel>Troco para quanto? <span className="normal-case font-normal tracking-normal">(opcional)</span></FieldLabel>
                <Input
                  placeholder="Ex: R$ 100,00"
                  value={change}
                  onChange={(e) => setChange(e.target.value)}
                  className="rounded-xl h-12 border-2 max-w-[180px] focus-visible:ring-0 focus-visible:border-foreground transition-colors"
                />
              </div>
            )}

            {payment === "pix" && (
              <div
                className="mt-6 rounded-3xl p-5 flex gap-3"
                style={{ backgroundColor: "color-mix(in oklch, var(--primary) 12%, var(--card))" }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  <QrCode className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-heading font-bold text-sm mb-1">Como funciona o PIX</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Após enviar o pedido pelo WhatsApp, o vendedor te manda o QR Code do PIX.
                  </p>
                </div>
              </div>
            )}

            {payment === "card" && (
              <div
                className="mt-6 rounded-3xl p-5 flex gap-3"
                style={{ backgroundColor: "color-mix(in oklch, var(--primary) 12%, var(--card))" }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-bold text-sm mb-1">Pagamento no cartão</p>
                  {acceptsInstallments ? (
                    <>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        💳 Parcele sua compra em até {FREE_INSTALLMENTS}x sem juros, o valor total
                        pode variar de acordo com o número de parcelas escolhido.
                      </p>
                      <div className="mt-3">
                        <FieldLabel>Em quantas vezes?</FieldLabel>
                        <select
                          value={installments}
                          onChange={(e) => setInstallments(Number(e.target.value))}
                          className={inputClass(
                            false,
                            "h-11 w-full rounded-xl border-2 bg-card px-3 focus-visible:ring-0 focus-visible:border-foreground transition-colors"
                          )}
                        >
                          {Array.from({ length: MAX_INSTALLMENTS }, (_, i) => i + 1).map((n) => {
                            const pct = INSTALLMENT_INTEREST_PCT[n] ?? 0;
                            const total = totalForInstallments(n);
                            return (
                              <option key={n} value={n}>
                                {n}x de {fmt(total / n)} {pct > 0 ? `(com juros, total ${fmt(total)})` : "sem juros"}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Leve o cartão na entrega, o pagamento é feito com a maquininha do entregador.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-8">
              <ActionButton color="var(--primary)" onClick={() => goTo(4)}>
                Continuar <ArrowRight className="w-4 h-4" />
              </ActionButton>
            </div>
          </div>
        )}

        {/* ── Step 4: Revisão ───────────────────────────────────────────────── */}
        {step === 4 && (
          <div key="step-4" className={animClass}>
            <StepTitle
              title="Tudo certo?"
              subtitle="Revise seu pedido antes de enviar."
            />

            {/* Warning */}
            <div
              className="mt-6 rounded-3xl p-5 flex gap-3"
              style={{ backgroundColor: "color-mix(in oklch, var(--primary) 12%, var(--card))" }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: "var(--primary)" }}
              >
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-heading font-bold text-sm mb-1">Confira todas as informações!</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  O botão abre o WhatsApp com a mensagem pronta. Você ainda precisa tocar em{" "}
                  <strong className="text-foreground">Enviar</strong> para confirmar o pedido com o vendedor.
                </p>
              </div>
            </div>

            {/* Items */}
            <div className="mt-6 bg-card border-2 border-border rounded-3xl overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <span className="font-heading font-bold text-base">
                  Itens
                </span>
                <span className="text-sm text-muted-foreground">
                  {displayCartCount} {displayCartCount === 1 ? "item" : "itens"}
                </span>
              </div>
              <Separator />
              <div className="divide-y divide-border">
                {displayCart.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 px-5 py-3.5">
                    {entry.imageUrl ? (
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0">
                        <Image src={entry.imageUrl} alt={entry.name} fill sizes="40px" className="object-cover" />
                      </div>
                    ) : (
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
                        style={{ backgroundColor: entry.visual.bg }}
                      >
                        {entry.visual.emoji}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-bold text-sm truncate">{entry.name}</p>
                      <p className="text-xs text-muted-foreground">{entry.quantity}× {fmt(entry.price)}</p>
                    </div>
                    <span className="font-heading font-bold text-sm shrink-0">
                      {fmt(entry.price * entry.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer + Address + Payment summary */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="bg-card border-2 border-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                    <span className="font-heading font-bold text-xs">Cliente</span>
                  </div>
                  <button
                    onClick={() => goTo(1)}
                    className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-foreground font-semibold leading-snug truncate">
                  {identity.name}
                </p>
                <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                  {identity.phone}
                </p>
              </div>

              {isPickup ? (
                <div className="bg-card border-2 border-border rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                      <span className="font-heading font-bold text-xs">Retirada</span>
                    </div>
                    <button
                      onClick={() => goTo(2)}
                      className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-foreground font-semibold leading-snug">
                    {PICKUP_ADDRESS.street}, {PICKUP_ADDRESS.number}
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                    {PICKUP_ADDRESS.neighborhood}
                  </p>
                </div>
              ) : acceptsDelivery ? (
                <div className="bg-card border-2 border-border rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                      <span className="font-heading font-bold text-xs">Endereço</span>
                    </div>
                    <button
                      onClick={() => goTo(2)}
                      className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-foreground font-semibold leading-snug">
                    {effectiveAddress.street}, {effectiveAddress.number}
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                    {effectiveAddress.neighborhood}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {effectiveAddress.city}/{effectiveAddress.state}
                  </p>
                </div>
              ) : (
                <div className="bg-card border-2 border-border rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <MapPin className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                    <span className="font-heading font-bold text-xs">Retirada</span>
                  </div>
                  <p className="text-xs text-foreground font-semibold leading-snug">Retirada no local</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">Combine o horário com a loja</p>
                </div>
              )}

              <div className="col-span-2 bg-card border-2 border-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                    <span className="font-heading font-bold text-xs">Pagamento</span>
                  </div>
                  <button
                    onClick={() => goTo(3)}
                    className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-foreground font-semibold leading-snug">
                  {payment === "pix" && "PIX"}
                  {payment === "cash" && "Dinheiro"}
                  {payment === "card" && "Cartão"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {payment === "pix" && "Aprovação imediata"}
                  {payment === "cash" && (change.trim() ? `Troco p/ ${change}` : "Na entrega")}
                  {payment === "card" &&
                    (displayCardAdjusted
                      ? `${displayInstallments}x de ${fmt(displayInstallmentValue)}${displayInstallmentPct > 0 ? " (com juros)" : " sem juros"}`
                      : "Na entrega")}
                </p>
              </div>
            </div>

            {/* Totals */}
            <div className="mt-6 bg-card border-2 border-border rounded-3xl p-5">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">{fmt(displayCartTotal)}</span>
                </div>
                {displayCardAdjusted && (
                  <p className="-mt-1.5 text-xs text-muted-foreground">
                    {displayInstallments}x de {fmt(displayInstallmentValue)}
                    {displayInstallmentPct > 0 ? ` (juros de ${fmtPct(displayInstallmentPct)})` : " sem juros"}
                  </p>
                )}
                {acceptsDelivery && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Entrega</span>
                    <span
                      className="font-semibold"
                      style={{ color: displayDelivery === 0 ? "var(--primary)" : "var(--foreground)" }}
                    >
                      {displayIsPickup ? "Retirada no local" : displayDelivery === 0 ? "Grátis 🎉" : fmt(displayDelivery)}
                    </span>
                  </div>
                )}
              </div>
              <Separator className="my-4" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground font-medium">Total</span>
                <span
                  className="font-heading text-4xl font-black tracking-tight"
                  style={{ color: "var(--primary)" }}
                >
                  {fmt(displayOrderTotal)}
                </span>
              </div>
            </div>

            {/* WhatsApp button */}
            <div className="mt-8">
              {!sent ? (
                <button
                  onClick={handleSendWhatsApp}
                  disabled={saving}
                  className="w-full h-16 rounded-2xl font-heading text-lg font-black gap-3 flex items-center justify-center text-white transition-all duration-200 cursor-pointer active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#25D366" }}
                >
                  {saving ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <WhatsAppIcon className="w-6 h-6" />
                      Enviar pedido pelo WhatsApp
                    </>
                  )}
                </button>
              ) : (
                <div className="border-2 rounded-2xl p-6 text-center flex flex-col items-center gap-3" style={{ borderColor: "#25D366" }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#25D366" }}>
                    <Check className="w-7 h-7 text-white stroke-[2.5]" />
                  </div>
                  <div>
                    <p className="font-heading font-black text-xl">WhatsApp aberto!</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      Envie a mensagem para confirmar. O vendedor entrará em contato em breve.
                    </p>
                  </div>
                  <button
                    onClick={handleBackToCatalog}
                    className="text-sm font-semibold underline underline-offset-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer mt-1"
                  >
                    Voltar ao catálogo
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CheckoutHeader({
  step,
  totalSteps,
  storeName,
  brandIcon,
  slug,
  onBack,
}: {
  step: number;
  totalSteps: number;
  storeName: string;
  brandIcon?: string;
  slug: string;
  onBack: () => void;
}) {
  const storeIcon = useMemo(
    () => createElement(getStoreIcon(brandIcon), { className: "w-5 h-5", style: { color: "var(--primary)" } }),
    [brandIcon]
  );
  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="max-w-md sm:max-w-xl md:max-w-2xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl flex items-center justify-center border-2 border-border hover:border-foreground transition-colors cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <a href={`/${slug}`} className="flex items-center gap-2" aria-label={storeName}>
          {storeIcon}
          <span className="font-heading text-lg font-bold tracking-tight" style={{ color: "var(--primary)" }}>
            {storeName}
          </span>
        </a>

        {step > 0 ? (
          <span className="font-heading text-sm font-bold text-muted-foreground tabular-nums">
            {step}/{totalSteps}
          </span>
        ) : (
          <div className="w-10" />
        )}
      </div>
    </header>
  );
}

function StepTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="font-heading text-4xl font-black tracking-tight leading-tight">
        {title}
      </h1>
      <p className="mt-2 text-muted-foreground">{subtitle}</p>
    </div>
  );
}
