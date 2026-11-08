"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock, Loader2 } from "lucide-react";
import { closeStoreToday, reopenStore } from "@/app/admin/loja/actions";

export function StoreClosureToggle({ initialClosedToday }: { initialClosedToday: boolean }) {
  const router = useRouter();
  const [closedToday, setClosedToday] = useState(initialClosedToday);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleToggle = () => {
    const nextClosed = !closedToday;
    setError("");
    setClosedToday(nextClosed);
    startTransition(async () => {
      const result = nextClosed ? await closeStoreToday() : await reopenStore();
      if (result?.error) {
        setClosedToday(!nextClosed);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div
      className="rounded-3xl border-2 p-5 flex items-center justify-between gap-4 flex-wrap"
      style={{
        borderColor: closedToday ? "var(--destructive)" : "var(--border)",
        backgroundColor: closedToday ? "color-mix(in srgb, var(--destructive) 8%, var(--card))" : "var(--card)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white"
          style={{ backgroundColor: closedToday ? "var(--destructive)" : "var(--primary)" }}
        >
          {closedToday ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        </div>
        <div>
          <span className="font-heading font-bold text-sm block">
            {closedToday ? "Loja fechada hoje" : "Loja aberta"}
          </span>
          <p className="mt-0.5 text-xs text-muted-foreground max-w-sm">
            {closedToday
              ? "Nenhum pedido está sendo aceito hoje. Amanhã ela reabre sozinha no horário normal."
              : "Precisa fechar por hoje (imprevisto, sem estoque, viagem)? Use o botão ao lado."}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className="shrink-0 h-10 px-4 rounded-full font-heading text-sm font-bold border-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
        style={
          closedToday
            ? { borderColor: "var(--primary)", color: "var(--primary)" }
            : { borderColor: "var(--destructive)", color: "var(--destructive)" }
        }
      >
        {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {closedToday ? "Reabrir loja" : "Fechar hoje"}
      </button>

      {error && <p className="w-full text-xs font-semibold text-destructive">{error}</p>}
    </div>
  );
}
