"use client";

// Usa Leaflet, que depende de `window`: este arquivo só deve ser carregado via
// next/dynamic com `ssr: false` (ver store-location-modal.tsx).
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

// Servidor público do OpenStreetMap: gratuito, mas sem garantia e com política
// de uso justo (https://operations.osmfoundation.org/policies/tiles/). Para
// volume alto em produção, aponte estas variáveis para um provedor de tiles
// (ex.: MapTiler, Stadia, Carto) e ajuste a atribuição.
const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>';

const DEFAULT_ZOOM = 17;

// Marcador próprio em SVG (cor da loja). Evita o problema clássico dos ícones
// padrão do Leaflet, cujas imagens não são encontradas quando empacotadas.
const storePinIcon = L.divIcon({
  className: "store-location-pin",
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 48" width="36" height="48" aria-hidden="true">
    <path d="M18 1C8.6 1 1 8.4 1 17.6 1 30 18 47 18 47s17-17 17-29.4C35 8.4 27.4 1 18 1z" style="fill:var(--primary)" stroke="#fff" stroke-width="2"/>
    <circle cx="18" cy="17.5" r="6.5" fill="#fff"/>
  </svg>`,
  iconSize: [36, 48],
  iconAnchor: [18, 47],
  popupAnchor: [0, -44],
});

/**
 * O mapa nasce dentro de um modal com animação de abertura; o Leaflet mede o
 * contêiner nesse momento e erraria o tamanho. Recalcula depois de montar e
 * sempre que o contêiner mudar de tamanho.
 */
function KeepSizeInSync() {
  const map = useMap();
  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 250);
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [map]);
  return null;
}

/** Abre o pop-up com o nome da loja assim que o marcador entra no mapa. */
function OpenPopupOnMount({ markerRef }: { markerRef: RefObject<L.Marker | null> }) {
  useEffect(() => {
    markerRef.current?.openPopup();
  }, [markerRef]);
  return null;
}

export type LocationMapProps = {
  latitude: number;
  longitude: number;
  storeName: string;
  address: string;
};

export default function LocationMap({ latitude, longitude, storeName, address }: LocationMapProps) {
  const position = useMemo<[number, number]>(() => [latitude, longitude], [latitude, longitude]);
  const markerRef = useRef<L.Marker | null>(null);
  const [tilesLoaded, setTilesLoaded] = useState(0);
  const [tileErrors, setTileErrors] = useState(0);
  const tilesFailed = tileErrors > 0 && tilesLoaded === 0;

  return (
    <div className="relative isolate h-full w-full">
      <MapContainer
        center={position}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="h-full w-full"
        aria-label={`Mapa com a localização de ${storeName}`}
      >
        <KeepSizeInSync />
        <TileLayer
          url={TILE_URL}
          attribution={TILE_ATTRIBUTION}
          maxZoom={19}
          eventHandlers={{
            tileload: () => setTilesLoaded((n) => n + 1),
            tileerror: () => setTileErrors((n) => n + 1),
          }}
        />
        <Marker
          position={position}
          icon={storePinIcon}
          ref={markerRef}
          keyboard
          title={storeName}
          alt={storeName}
        >
          <Popup>
            <strong>{storeName}</strong>
            <br />
            {address}
          </Popup>
        </Marker>
        <OpenPopupOnMount markerRef={markerRef} />
      </MapContainer>

      {tilesFailed && (
        <div
          role="status"
          className="absolute inset-0 z-[1000] flex items-center justify-center bg-card/90 p-6 text-center text-sm text-muted-foreground"
        >
          Não foi possível carregar o mapa agora. Use o endereço acima ou o botão do Google Maps.
        </div>
      )}
    </div>
  );
}
