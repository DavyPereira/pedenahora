"use client";

import { Component, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPinned, Navigation, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatFullPickupAddress,
  getPickupCoordinates,
  getPickupLocation,
  googleMapsDirectionsUrl,
} from "@/lib/pickup-locations";

// Leaflet acessa `window` ao ser importado: carrega só no navegador.
const LocationMap = dynamic(() => import("@/components/location-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin" />
      Carregando mapa…
    </div>
  ),
});

/** Se o mapa quebrar ao renderizar, o resto do modal (endereço e rota) continua. */
class MapErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div
          role="status"
          className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-muted-foreground"
        >
          Não foi possível exibir o mapa. Use o endereço acima ou o botão do Google Maps.
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Botão "Ver localização da loja" + modal com mapa interativo, para pedidos de
 * retirada. Não renderiza nada se a loja não tem endereço de retirada ou se as
 * coordenadas ainda não foram configuradas em lib/pickup-locations.ts.
 */
export function StoreLocationButton({
  slug,
  storeName,
  variant = "default",
}: {
  slug: string;
  storeName: string;
  /** "default": botão com borda; "link": texto discreto para cards pequenos. */
  variant?: "default" | "link";
}) {
  const [open, setOpen] = useState(false);
  const location = getPickupLocation(slug);
  const coordinates = getPickupCoordinates(location);
  if (!location || !coordinates) return null;

  const fullAddress = formatFullPickupAddress(location);
  const routeUrl = googleMapsDirectionsUrl(coordinates);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === "link"
            ? "mt-2 inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2 cursor-pointer hover:opacity-80 transition-opacity"
            : "mt-3 inline-flex h-10 items-center gap-2 rounded-xl border-2 px-4 text-sm font-heading font-bold cursor-pointer transition-colors hover:bg-card active:scale-[0.98]"
        }
        style={
          variant === "link"
            ? { color: "var(--primary)" }
            : { color: "var(--primary)", borderColor: "var(--primary)" }
        }
      >
        <MapPinned className={variant === "link" ? "w-3.5 h-3.5" : "w-4 h-4"} />
        Ver localização da loja
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-lg bg-card"
        >
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
            <div className="min-w-0">
              <DialogTitle className="font-heading text-xl font-black tracking-tight">
                Localização para retirada
              </DialogTitle>
              <p className="mt-1 font-heading text-sm font-bold" style={{ color: "var(--primary)" }}>
                {storeName}
              </p>
              <DialogDescription className="mt-0.5 text-sm leading-relaxed">
                {fullAddress}
              </DialogDescription>
            </div>
            <DialogClose
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border-2 border-border hover:border-foreground transition-colors cursor-pointer active:scale-95"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </DialogClose>
          </div>

          <div className="h-[45vh] max-h-[380px] min-h-[240px] w-full border-y border-border bg-muted">
            <MapErrorBoundary>
              <LocationMap
                latitude={coordinates.latitude}
                longitude={coordinates.longitude}
                storeName={storeName}
                address={fullAddress}
              />
            </MapErrorBoundary>
          </div>

          <div className="p-5">
            <a
              href={routeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-12 rounded-2xl font-heading font-bold text-base flex items-center justify-center gap-2 text-white transition-all active:scale-[0.98] hover:opacity-90"
              style={{ backgroundColor: "var(--primary)" }}
            >
              <Navigation className="w-4 h-4" />
              Abrir rota no Google Maps
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
