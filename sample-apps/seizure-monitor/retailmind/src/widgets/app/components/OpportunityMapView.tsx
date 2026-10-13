"use client";

import { useEffect, useRef } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import type {
  CircleMarker as LeafletCircleMarker,
  LatLngBoundsExpression,
  LatLngTuple,
} from "leaflet";
// Vendored Leaflet CSS. The upstream stylesheet cannot be imported directly
// because the widget bundler has no PNG loader — see the file's header.
import "./leaflet-core.css";
import type { ZoneAnalysis } from "../hooks/useAnalysis";

interface OpportunityMapViewProps {
  zones: ZoneAnalysis[];
  topZoneId: string;
  /** Zone currently hovered in the card grid below the map. */
  hoveredZoneId?: string | null;
  /** Zone the user clicked in the card grid; the map flies to it. */
  focusedZoneId?: string | null;
}

/**
 * Marker colours by opportunity tier. Deliberately the same green/amber/red
 * the rest of the report uses, so a zone reads the same on the map as it does
 * on its card.
 */
const tierColors: Record<ZoneAnalysis["tier"], string> = {
  high: "#22c55e",
  medium: "#f59e0b",
  low: "#ef4444",
};

/**
 * Frames the map on the zones actually returned by the analysis, so it works
 * for any city without a hardcoded centre or zoom.
 */
function FitToZones({ zones }: { zones: ZoneAnalysis[] }) {
  const map = useMap();

  useEffect(() => {
    if (zones.length === 0) return;

    const points: LatLngTuple[] = zones.map((z) => [
      z.zone.latitude,
      z.zone.longitude,
    ]);

    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }

    // Padding keeps markers off the edges; maxZoom stops a tight cluster of
    // zones from zooming in so far that the surrounding city is lost.
    map.fitBounds(points as LatLngBoundsExpression, {
      padding: [40, 40],
      maxZoom: 15,
    });
  }, [map, zones]);

  return null;
}

/**
 * Flies the map to a zone selected in the card grid and opens its popup, so a
 * click in the report and a click on the map end in the same place.
 */
function FocusZone({
  zones,
  focusedZoneId,
  markers,
}: {
  zones: ZoneAnalysis[];
  focusedZoneId?: string | null;
  markers: React.MutableRefObject<Record<string, LeafletCircleMarker | null>>;
}) {
  const map = useMap();

  useEffect(() => {
    if (!focusedZoneId) return;

    const zone = zones.find((z) => z.zone.id === focusedZoneId);
    if (!zone) return;

    map.flyTo([zone.zone.latitude, zone.zone.longitude], 15, {
      duration: 0.7,
    });

    // Wait for the flight to finish before opening, otherwise Leaflet
    // repositions the popup mid-animation and it can end up off-screen.
    const timer = setTimeout(() => {
      markers.current[focusedZoneId]?.openPopup();
    }, 750);

    return () => clearTimeout(timer);
  }, [map, zones, focusedZoneId, markers]);

  return null;
}

export default function OpportunityMapView({
  zones,
  topZoneId,
  hoveredZoneId,
  focusedZoneId,
}: OpportunityMapViewProps) {
  const markers = useRef<Record<string, LeafletCircleMarker | null>>({});

  if (zones.length === 0) return null;

  return (
    <MapContainer
      // A center/zoom is required by the component, but FitToZones immediately
      // overrides it from the real coordinates.
      center={[zones[0].zone.latitude, zones[0].zone.longitude]}
      zoom={12}
      scrollWheelZoom={false}
      className="h-full w-full"
      style={{ background: "#f8fafc" }}
    >
      {/* CartoDB Positron: light, low-label basemap so the score markers are
          the loudest thing on the map. Still plain OSM-derived XYZ tiles —
          no API key, no account, no new data source. */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />

      <FitToZones zones={zones} />
      <FocusZone zones={zones} focusedZoneId={focusedZoneId} markers={markers} />

      {zones.map((z) => {
        const isTop = z.zone.id === topZoneId;
        const isHovered = z.zone.id === hoveredZoneId;
        const color = tierColors[z.tier];
        const baseRadius = isTop ? 14 : 8;

        return (
          <CircleMarker
            key={z.zone.id}
            ref={(instance) => {
              markers.current[z.zone.id] = instance;
            }}
            center={[z.zone.latitude, z.zone.longitude]}
            // The recommended zone is deliberately larger and more opaque so
            // it reads as the answer at a glance; hovering its card in the
            // report below grows whichever marker it refers to.
            radius={isHovered ? baseRadius + 6 : baseRadius}
            pathOptions={{
              color: isHovered ? "#0f172a" : isTop ? "#15803d" : color,
              weight: isHovered ? 4 : isTop ? 3 : 2,
              fillColor: color,
              fillOpacity: isHovered ? 0.95 : isTop ? 0.85 : 0.6,
            }}
          >
            {isTop && (
              <Tooltip permanent direction="top" offset={[0, -14]}>
                <span className="text-[11px] font-semibold">Recommended</span>
              </Tooltip>
            )}

            <Popup>
              <div className="min-w-[190px]">
                <p className="text-sm font-semibold text-gray-900">
                  {z.zone.name}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Rank #{z.rank}
                  {isTop ? " · Recommended" : ""}
                </p>

                <dl className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Opportunity</dt>
                    <dd className="font-semibold text-gray-900">
                      {z.zone.opportunityScore}/100
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Footfall potential</dt>
                    <dd className="font-medium text-gray-900">
                      {z.zone.footfallScore}/100
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Demographics</dt>
                    <dd className="font-medium text-gray-900">
                      {z.zone.demographicScore}/100
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Competition</dt>
                    <dd className="font-medium text-gray-900">
                      {z.zone.competitionScore}/100
                    </dd>
                  </div>
                  {/* Cost pressure only exists on results from the current
                      output shape, so it is rendered conditionally. */}
                  {typeof z.zone.costPressureIndex === "number" && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500">Cost pressure</dt>
                      <dd className="font-medium text-gray-900">
                        {z.zone.costPressureIndex}/100
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
