"use client";

import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, QrCode } from "lucide-react";
import { buildPixPayload, normalizePixKey } from "@/lib/pix";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback para navegadores sem Clipboard API (ex.: HTTP, webviews antigas).
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * Pix Copia e Cola + QR Code com o valor do pedido, na tela de revisão.
 * Não renderiza nada se a loja não tiver chave Pix válida cadastrada.
 */
export function PixPayment({
  pixKey,
  storeName,
  city,
  amount,
}: {
  pixKey: string;
  storeName: string;
  city?: string;
  amount: number;
}) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const payload = useMemo(() => {
    const normalized = normalizePixKey(pixKey);
    if (!normalized || !(amount > 0)) return null;
    return buildPixPayload({ key: normalized.key, merchantName: storeName, merchantCity: city, amount });
  }, [pixKey, storeName, city, amount]);

  if (!payload) return null;

  const handleCopy = async () => {
    const ok = await copyText(payload);
    setCopied(ok);
    setCopyFailed(!ok);
    if (ok) setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="mt-6 bg-card border-2 border-border rounded-3xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <QrCode className="w-4 h-4" style={{ color: "var(--primary)" }} />
        <span className="font-heading font-bold text-sm">Pague com PIX</span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Escaneie o QR Code ou copie o código e cole no app do seu banco, em <strong>Pix Copia e Cola</strong>.
      </p>

      <div className="mt-4 flex justify-center">
        <div className="bg-white p-3 rounded-2xl border-2 border-border">
          <QRCodeSVG value={payload} size={184} marginSize={0} level="M" title={`QR Code PIX de ${fmt(amount)}`} />
        </div>
      </div>

      <p className="mt-3 text-center text-sm">
        Valor: <span className="font-heading font-black" style={{ color: "var(--primary)" }}>{fmt(amount)}</span>
      </p>

      <button
        type="button"
        onClick={handleCopy}
        className="mt-4 w-full h-12 rounded-2xl font-heading font-bold flex items-center justify-center gap-2 text-white transition-all duration-200 cursor-pointer active:scale-[0.97]"
        style={{ backgroundColor: copied ? "#16a34a" : "var(--primary)" }}
      >
        {copied ? (
          <>
            <Check className="w-5 h-5" /> Código copiado!
          </>
        ) : (
          <>
            <Copy className="w-5 h-5" /> Copiar código PIX
          </>
        )}
      </button>

      {copyFailed && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-1">Não deu para copiar automaticamente. Segure o código abaixo para copiar:</p>
          <textarea
            readOnly
            value={payload}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full h-20 text-xs font-mono rounded-xl border-2 border-border bg-background p-2 resize-none"
          />
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground leading-relaxed text-center">
        Depois de pagar, envie o pedido pelo WhatsApp e mande o comprovante para a loja.
      </p>
    </div>
  );
}
