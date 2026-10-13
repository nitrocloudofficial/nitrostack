'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import type { GeoJsonObject } from 'geojson';
import { RankedHospitalData, GeoJSONRouteData } from './types';
import { LEAFLET_CORE_CSS } from './leaflet-styles';

/**
 * Custom divIcon markers avoid the well-known Next.js/webpack issue where
 * Leaflet's default marker PNG assets fail to resolve after bundling.
 */
function createMarkerIcon(background: string, emoji: string, pulse = false): L.DivIcon {
  return L.divIcon({
    className: 'lifeline-marker',
    html: `<div style="background:${background};width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.45);font-size:15px;line-height:1;${pulse ? 'animation:lifeline-marker-pulse 1.6s ease-in-out infinite;' : ''}">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

const MARKER_PULSE_KEYFRAMES = `@keyframes lifeline-marker-pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(22,163,74,0.5); }
  50% { transform: scale(1.12); box-shadow: 0 0 0 8px rgba(22,163,74,0); }
}`;

const originIcon = createMarkerIcon('#dc2626', '📍');
const hospitalIcon = createMarkerIcon('#2563eb', '🏥');
const selectedIcon = createMarkerIcon('#16a34a', '🏥', true);

const DEFAULT_CENTER: [number, number] = [11.0168, 76.9558];

/**
 * Imperative camera control — react-leaflet's `MapContainer center` prop is
 * only the INITIAL position, so moving the camera on selection/route change
 * requires calling the underlying Leaflet map instance directly via useMap().
 * Must be rendered as a child of <MapContainer>.
 */
function CameraController({
  origin,
  selectedHospital,
  route,
}: {
  origin: { latitude: number; longitude: number } | null;
  selectedHospital: RankedHospitalData | null;
  route: GeoJSONRouteData | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedHospital && origin) {
      const bounds = L.latLngBounds(
        [origin.latitude, origin.longitude],
        [selectedHospital.latitude, selectedHospital.longitude]
      );
      if (route && route.geometry.coordinates.length > 0) {
        for (const [lon, lat] of route.geometry.coordinates) {
          bounds.extend([lat, lon]);
        }
      }
      map.flyToBounds(bounds, { padding: [48, 48], duration: 0.8, maxZoom: 14 });
    } else if (origin) {
      map.flyTo([origin.latitude, origin.longitude], 12, { duration: 0.8 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHospital?.hospital_id, origin?.latitude, origin?.longitude, route]);

  return null;
}

interface MapViewProps {
  origin: { latitude: number; longitude: number } | null;
  hospitals: RankedHospitalData[];
  selectedHospitalId: string | null;
  route: GeoJSONRouteData | null;
  onSelectHospital: (hospitalId: string) => void;
}

export default function MapView({ origin, hospitals, selectedHospitalId, route, onSelectHospital }: MapViewProps) {
  const selectedHospital = hospitals.find((h) => h.hospital_id === selectedHospitalId) ?? null;
  const center: [number, number] = origin
    ? [origin.latitude, origin.longitude]
    : hospitals.length > 0
      ? [hospitals[0].latitude, hospitals[0].longitude]
      : DEFAULT_CENTER;

  return (
    <>
      <style>{LEAFLET_CORE_CSS}</style>
      <style>{MARKER_PULSE_KEYFRAMES}</style>
      <MapContainer center={center} zoom={11} style={{ width: '100%', height: '100%' }} scrollWheelZoom>
      <CameraController origin={origin} selectedHospital={selectedHospital} route={route} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {origin && (
        <Marker position={[origin.latitude, origin.longitude]} icon={originIcon}>
          <Popup>Emergency location</Popup>
        </Marker>
      )}

      {hospitals.map((hospital) => (
        <Marker
          key={hospital.hospital_id}
          position={[hospital.latitude, hospital.longitude]}
          icon={hospital.hospital_id === selectedHospitalId ? selectedIcon : hospitalIcon}
          eventHandlers={{ click: () => onSelectHospital(hospital.hospital_id) }}
        >
          <Popup>
            <strong>{hospital.hospital_name}</strong>
            <br />
            Match score: {hospital.match_score}/100
            <br />
            ER beds: {hospital.er_beds_available} &middot; ICU beds: {hospital.icu_beds_available}
            <br />
            {hospital.distance_km.toFixed(1)} km &middot; ~{hospital.eta_minutes} min
          </Popup>
        </Marker>
      ))}

      {route && (
        <GeoJSON
          key={`${route.geometry.coordinates[0]?.join(',')}-${route.geometry.coordinates.length}`}
          data={route as unknown as GeoJsonObject}
          style={{ color: '#2563eb', weight: 4, opacity: 0.85 }}
        />
      )}
      </MapContainer>
    </>
  );
}
