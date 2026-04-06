import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

const pickerIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

type MapPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Valeurs actuelles du formulaire (WGS-84) */
  initialLat: number;
  initialLng: number;
  /** Appelé une fois à la validation */
  onApply: (lat: number, lng: number) => void;
};

function MapResizeTrigger({ active }: { active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    const raf = requestAnimationFrame(() => map.invalidateSize());
    const t2 = globalThis.setTimeout(() => map.invalidateSize(), 250);
    return () => {
      cancelAnimationFrame(raf);
      globalThis.clearTimeout(t2);
    };
  }, [active, map]);
  return null;
}

function MapClickMarker({
  position,
  onPick,
}: {
  position: [number, number];
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return <Marker position={position} icon={pickerIcon} />;
}

function MapBody({
  position,
  onPick,
  mapActive,
}: {
  position: [number, number];
  onPick: (lat: number, lng: number) => void;
  mapActive: boolean;
}) {
  return (
    <MapContainer
      center={position}
      zoom={14}
      className={cn("z-0 h-full min-h-[280px] w-full rounded-xl")}
      scrollWheelZoom
      zoomControl={false}
      aria-label="Carte interactive — cliquez pour placer le point"
    >
      <TileLayer attribution={OSM_ATTRIBUTION} url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapResizeTrigger active={mapActive} />
      <MapClickMarker position={position} onPick={onPick} />
    </MapContainer>
  );
}

export function MapPickerDialog({
  open,
  onOpenChange,
  initialLat,
  initialLng,
  onApply,
}: MapPickerDialogProps) {
  const [pending, setPending] = useState<[number, number]>([initialLat, initialLng]);

  useLayoutEffect(() => {
    if (open) {
      setPending([initialLat, initialLng]);
    }
  }, [open, initialLat, initialLng]);

  const handleApply = useCallback(() => {
    onApply(pending[0], pending[1]);
    onOpenChange(false);
  }, [onApply, onOpenChange, pending]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(92vh,900px)] max-w-[min(100vw-1rem,52rem)] flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl",
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-1 border-b border-border/60 bg-muted/20 px-6 py-4 text-left">
          <DialogTitle className="text-lg font-semibold tracking-tight">Choisir le centre sur la carte</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Cliquez sur la carte pour positionner le point (WGS-84). Les coordonnées sont appliquées au formulaire lorsque
            vous validez.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-3 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 font-mono text-xs text-muted-foreground sm:text-sm">
            <span className="text-foreground/80">Lat.</span>
            <span className="font-medium text-foreground">{pending[0].toFixed(6)}</span>
            <span className="text-border">|</span>
            <span className="text-foreground/80">Long.</span>
            <span className="font-medium text-foreground">{pending[1].toFixed(6)}</span>
          </div>

          <div className="relative h-[min(48vh,420px)] w-full overflow-hidden rounded-xl border border-border/80 bg-muted/30 shadow-inner">
            {open ? (
              <MapBody
                position={pending}
                onPick={(lat, lng) => setPending([lat, lng])}
                mapActive={open}
              />
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Tuiles{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              className="font-medium text-primary underline-offset-2 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              OpenStreetMap
            </a>{" "}
            — usage libre, contributeurs OSM.
          </p>
        </div>

        <DialogFooter className="gap-2 border-t border-border/60 bg-muted/10 px-4 py-4 sm:px-6">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" className="rounded-xl shadow-sm shadow-primary/15" onClick={handleApply}>
            Appliquer les coordonnées
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
