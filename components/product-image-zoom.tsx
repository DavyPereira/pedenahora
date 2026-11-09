"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X, ZoomIn, ZoomOut } from "lucide-react";

const ZOOM_FACTOR = 2.5;
// Distância (px) que o mouse precisa andar para virar "arrastar" em vez de clique.
const DRAG_THRESHOLD = 5;

export type ZoomableProduct = {
  name: string;
  description: string;
  imageUrl: string;
  priceLabel: string;
};

/**
 * Visualizador em tela cheia da foto do produto. Toque/clique na foto amplia
 * no ponto tocado; com a foto ampliada dá para arrastar (dedo ou mouse) e
 * tocar de novo para voltar ao tamanho normal.
 */
export function ProductImageZoom({
  product,
  onOpenChange,
}: {
  product: ZoomableProduct | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <DialogPrimitive.Root open={!!product} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0"
          aria-describedby={undefined}
        >
          {product && <ZoomBody key={product.imageUrl} product={product} />}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ZoomBody({ product }: { product: ZoomableProduct }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [zoomed, setZoomed] = useState(false);
  // Largura da foto antes do zoom e o ponto (0–1) que o cliente tocou nela.
  const [baseWidth, setBaseWidth] = useState(0);
  const focus = useRef({ fx: 0.5, fy: 0.5, cx: 0, cy: 0 });
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  // Depois de ampliar, rola para manter o ponto tocado embaixo do dedo/cursor.
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const img = imgRef.current;
    if (!zoomed || !scroller || !img) return;
    const { fx, fy, cx, cy } = focus.current;
    const imgBox = img.getBoundingClientRect();
    const scrollerBox = scroller.getBoundingClientRect();
    const imgLeftInContent = imgBox.left - scrollerBox.left + scroller.scrollLeft;
    const imgTopInContent = imgBox.top - scrollerBox.top + scroller.scrollTop;
    scroller.scrollLeft = imgLeftInContent + fx * imgBox.width - cx;
    scroller.scrollTop = imgTopInContent + fy * imgBox.height - cy;
  }, [zoomed]);

  const toggleZoom = (e: React.MouseEvent<HTMLImageElement>) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (zoomed) {
      setZoomed(false);
      return;
    }
    const img = e.currentTarget;
    const scroller = scrollRef.current;
    if (!scroller) return;
    const box = img.getBoundingClientRect();
    const scrollerBox = scroller.getBoundingClientRect();
    focus.current = {
      fx: (e.clientX - box.left) / box.width,
      fy: (e.clientY - box.top) / box.height,
      cx: e.clientX - scrollerBox.left,
      cy: e.clientY - scrollerBox.top,
    };
    setBaseWidth(box.width);
    setZoomed(true);
  };

  // No toque o próprio navegador rola a área ampliada; o arrasto manual é só pro mouse.
  const onPointerDown = (e: React.PointerEvent) => {
    if (!zoomed || e.pointerType !== "mouse" || !scrollRef.current) return;
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      left: scrollRef.current.scrollLeft,
      top: scrollRef.current.scrollTop,
      moved: false,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const scroller = scrollRef.current;
    if (!d || !scroller) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    d.moved = true;
    scroller.scrollLeft = d.left - dx;
    scroller.scrollTop = d.top - dy;
  };
  const onPointerUp = () => {
    if (drag.current?.moved) suppressClick.current = true;
    drag.current = null;
  };

  return (
    <>
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 text-white">
        <div className="min-w-0">
          <DialogPrimitive.Title className="font-heading text-lg font-bold leading-tight">
            {product.name}
          </DialogPrimitive.Title>
          <p className="mt-0.5 font-heading text-base font-extrabold">{product.priceLabel}</p>
        </div>
        <DialogPrimitive.Close
          className="shrink-0 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </DialogPrimitive.Close>
      </div>

      <div
        ref={scrollRef}
        className={`relative flex-1 min-h-0 ${zoomed ? "overflow-auto" : "overflow-hidden"}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div
          className={
            zoomed
              ? "flex min-w-full min-h-full w-max items-center justify-center"
              : "flex h-full w-full items-center justify-center p-4"
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- precisa do tamanho real em px para o zoom */}
          <img
            ref={imgRef}
            src={product.imageUrl}
            alt={product.name}
            draggable={false}
            onClick={toggleZoom}
            className={`select-none ${
              zoomed
                ? "max-w-none cursor-zoom-out"
                : "max-w-full max-h-full object-contain cursor-zoom-in"
            }`}
            style={zoomed ? { width: baseWidth * ZOOM_FACTOR, height: "auto" } : undefined}
          />
        </div>
      </div>

      <div className="px-4 pt-3 pb-5 text-white/80">
        {product.description && (
          <p className="text-sm leading-relaxed max-h-24 overflow-y-auto">{product.description}</p>
        )}
        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-white/60">
          {zoomed ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
          {zoomed ? "Arraste para ver os detalhes · toque para diminuir" : "Toque na foto para ampliar"}
        </p>
      </div>
    </>
  );
}
