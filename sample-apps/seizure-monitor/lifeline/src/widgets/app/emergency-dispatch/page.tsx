'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { useWidgetSDK, useWidgetState, useTheme } from '@nitrostack/widgets';
import HospitalList from './HospitalList';
import ReservationModal from './ReservationModal';
import SeverityBanner from './SeverityBanner';
import PatientSummary from './PatientSummary';
import WorkflowTimeline from './WorkflowTimeline';
import FeaturedHospitalCard from './FeaturedHospitalCard';
import ExplainabilityPanel from './ExplainabilityPanel';
import ReservationPanel from './ReservationPanel';
import SystemStatusPanel from './SystemStatusPanel';
import DeveloperPanel from './DeveloperPanel';
import CallHospitalDialog from './CallHospitalDialog';
import HospitalDetailsModal from './HospitalDetailsModal';
import Toast, { ToastData } from './Toast';
import { parseToolResult, buildNavigationUrl, shareOrCopy, safeOpenExternal, deriveDepartmentLabel, toFiniteNumber } from './utils';
import {
  RankHospitalsOutputData,
  RankHospitalsToolInputData,
  RouteResultData,
  ReservationResultData,
  ReservationRequestPayload,
  ToolCallLogEntry,
  RankedHospitalData,
} from './types';

// Leaflet touches `window` at import time; this project statically exports
// (next.config.js output: 'export'), so the map must never render during
// server-side build.
const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <MapPlaceholder label="Loading map…" />,
});

interface EmergencyDispatchState {
  selectedHospitalId: string | null;
  dispatchStartedAt: number | null;
  [key: string]: unknown;
}

function MapPlaceholder({ label }: { label: string }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(148,163,184,0.9)', fontSize: 13 }}>
      {label}
    </div>
  );
}

export default function EmergencyDispatchWidget() {
  const theme = useTheme();
  const isDark = theme === 'dark';
  const { isReady, getToolOutput, getToolInput, callTool, openExternal, maxHeight } = useWidgetSDK();

  const [state, setState] = useWidgetState<EmergencyDispatchState>(() => ({
    selectedHospitalId: null,
    dispatchStartedAt: null,
  }));

  const originalOutput = getToolOutput<RankHospitalsOutputData>();
  const toolInput = getToolInput<RankHospitalsToolInputData & { origin_latitude: number; origin_longitude: number }>();

  // Retry Search replaces this with a freshly re-ranked result without
  // requiring the host to re-invoke rank_hospitals — the widget can call any
  // registered tool itself, not just the two it drives by default.
  const [refreshedOutput, setRefreshedOutput] = useState<RankHospitalsOutputData | null>(null);
  const [isRetryingSearch, setIsRetryingSearch] = useState(false);
  const output = refreshedOutput ?? originalOutput;

  const [route, setRoute] = useState<RouteResultData | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeRetryTick, setRouteRetryTick] = useState(0);

  const [reservingHospitalId, setReservingHospitalId] = useState<string | null>(null);
  const [isReserving, setIsReserving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [confirmedReservation, setConfirmedReservation] = useState<ReservationResultData | null>(null);

  const [callDialogHospitalId, setCallDialogHospitalId] = useState<string | null>(null);
  const [detailsHospitalId, setDetailsHospitalId] = useState<string | null>(null);

  const [toolCallLog, setToolCallLog] = useState<ToolCallLogEntry[]>([]);
  const [toast, setToast] = useState<ToastData | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(kind: ToastData['kind'], message: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ kind, message });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const hospitals = output?.hospitals ?? [];
  const selectedHospitalId =
    state?.selectedHospitalId ?? output?.recommended_hospital_id ?? hospitals[0]?.hospital_id ?? null;
  const selectedHospital = hospitals.find((h) => h.hospital_id === selectedHospitalId) ?? null;
  const selectedHospitalRank = selectedHospital ? hospitals.findIndex((h) => h.hospital_id === selectedHospitalId) + 1 : 0;
  const originLatitude = toolInput ? toFiniteNumber(toolInput.origin_latitude) : null;
  const originLongitude = toolInput ? toFiniteNumber(toolInput.origin_longitude) : null;
  const origin = originLatitude !== null && originLongitude !== null ? { latitude: originLatitude, longitude: originLongitude } : null;
  const reservingHospital = hospitals.find((h) => h.hospital_id === reservingHospitalId) ?? null;
  const callDialogHospital = hospitals.find((h) => h.hospital_id === callDialogHospitalId) ?? null;
  const detailsHospital = hospitals.find((h) => h.hospital_id === detailsHospitalId) ?? null;

  // Golden Hour countdown starts the moment this widget first receives ranked
  // hospital data — Lifeline has no clinical incident-onset timestamp, so this
  // is a proxy for "time since dispatch began," recorded once and persisted.
  useEffect(() => {
    if (output && !state?.dispatchStartedAt) {
      setState({ ...(state ?? { selectedHospitalId: null, dispatchStartedAt: null }), dispatchStartedAt: Date.now() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!output]);

  function logCall<T>(toolName: string, args: Record<string, unknown>, run: () => Promise<T>): Promise<T> {
    const id = `${toolName}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const startedAt = Date.now();
    setToolCallLog((prev) => [
      ...prev,
      { id, toolName, startedAt, durationMs: null, status: 'pending', requestPayload: args, responseSummary: null },
    ]);
    return run()
      .then((result) => {
        setToolCallLog((prev) =>
          prev.map((entry) =>
            entry.id === id
              ? { ...entry, status: 'success', durationMs: Date.now() - startedAt, responseSummary: JSON.stringify(result).slice(0, 160) }
              : entry
          )
        );
        return result;
      })
      .catch((error: unknown) => {
        setToolCallLog((prev) =>
          prev.map((entry) =>
            entry.id === id
              ? { ...entry, status: 'error', durationMs: Date.now() - startedAt, responseSummary: error instanceof Error ? error.message : String(error) }
              : entry
          )
        );
        throw error;
      });
  }

  useEffect(() => {
    if (!selectedHospital || !origin) {
      setRoute(null);
      return;
    }

    let cancelled = false;
    setIsLoadingRoute(true);
    setRouteError(null);

    const args = {
      origin_latitude: origin.latitude,
      origin_longitude: origin.longitude,
      destination_latitude: selectedHospital.latitude,
      destination_longitude: selectedHospital.longitude,
    };

    logCall('calculate_route', args, () => callTool('calculate_route', args))
      .then((response) => {
        if (cancelled) return;
        setRoute(parseToolResult<RouteResultData>(response));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setRoute(null);
        setRouteError(error instanceof Error ? error.message : 'Failed to calculate route.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRoute(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHospitalId, origin?.latitude, origin?.longitude, routeRetryTick]);

  function handleSelectHospital(hospitalId: string) {
    setState((prev) => ({ ...(prev ?? { selectedHospitalId: null, dispatchStartedAt: null }), selectedHospitalId: hospitalId }));
  }

  function openReservationModal(hospitalId: string) {
    setModalError(null);
    setReservingHospitalId(hospitalId);
  }

  function closeReservationModal() {
    setReservingHospitalId(null);
    setModalError(null);
  }

  async function submitReservation(payload: ReservationRequestPayload) {
    if (!reservingHospital) return;
    setIsReserving(true);
    setModalError(null);

    const args = { hospital_id: reservingHospital.hospital_id, ...payload };

    try {
      const response = await logCall('request_emergency_reservation', args, () => callTool('request_emergency_reservation', args));
      const result = parseToolResult<ReservationResultData>(response);
      setConfirmedReservation(result);
    } catch (error) {
      setModalError(error instanceof Error ? error.message : 'Reservation failed. Please try again.');
    } finally {
      setIsReserving(false);
    }
  }

  function handleCallEmergency() {
    if (!safeOpenExternal(openExternal, 'tel:108')) {
      showToast('error', 'Unable to launch the phone dialer on this device.');
    }
  }

  function handleOpenNavigationFor(hospital: RankedHospitalData) {
    const url = buildNavigationUrl(origin, hospital);
    if (!safeOpenExternal(openExternal, url)) {
      showToast('error', 'Unable to launch Maps.');
    }
  }

  function handleCallNowFor(phoneNumber: string) {
    if (!safeOpenExternal(openExternal, `tel:${phoneNumber}`)) {
      showToast('error', `Unable to launch the phone dialer. Hospital contact: ${phoneNumber}`);
    }
  }

  async function handleShareLocation() {
    if (!origin) return;
    const result = await shareOrCopy('Lifeline Emergency Location', `Emergency location: https://maps.google.com/?q=${origin.latitude},${origin.longitude}`);
    showToast(
      result === 'unavailable' ? 'info' : 'success',
      result === 'shared' ? 'Location shared.' : result === 'copied' ? 'Location copied to clipboard.' : 'Sharing is unavailable in this context.'
    );
  }

  async function handleShareReservation() {
    if (!confirmedReservation) return;
    const text = `Emergency bed reserved.\nHospital: ${confirmedReservation.hospital_name}\nConfirmation: ${confirmedReservation.confirmation_code}\nDepartment: ${confirmedReservation.department}`;
    const result = await shareOrCopy('Lifeline Reservation', text);
    showToast(
      result === 'unavailable' ? 'info' : 'success',
      result === 'shared' ? 'Reservation shared.' : result === 'copied' ? 'Reservation details copied to clipboard.' : 'Sharing is unavailable in this context.'
    );
  }

  async function handleRetrySearch() {
    if (!origin || !toolInput || isRetryingSearch) return;
    setIsRetryingSearch(true);
    try {
      const nearbyArgs = { latitude: origin.latitude, longitude: origin.longitude, required_capability: toolInput.required_capability };
      const nearbyResponse = await logCall('get_nearby_hospitals', nearbyArgs, () => callTool('get_nearby_hospitals', nearbyArgs));
      const nearby = parseToolResult<{ hospitals: RankedHospitalData[] }>(nearbyResponse);

      const rankArgs = {
        hospitals: nearby.hospitals,
        required_capability: toolInput.required_capability,
        origin_latitude: origin.latitude,
        origin_longitude: origin.longitude,
        severity: toolInput.severity,
        confidence: toolInput.confidence,
        triage_reasoning: toolInput.triage_reasoning,
        patient: toolInput.patient,
      };
      const rankResponse = await logCall('rank_hospitals', rankArgs, () => callTool('rank_hospitals', rankArgs));
      const ranked = parseToolResult<RankHospitalsOutputData>(rankResponse);

      setRefreshedOutput(ranked);
      setState((prev) => ({ ...(prev ?? { selectedHospitalId: null, dispatchStartedAt: null }), selectedHospitalId: null }));
      showToast('success', `Search refreshed — ${ranked.hospitals.length} hospital(s) found.`);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Retry search failed. Please try again.');
    } finally {
      setIsRetryingSearch(false);
    }
  }

  function openCallDialog(hospitalId: string) {
    setCallDialogHospitalId(hospitalId);
  }

  function openDetailsModal(hospitalId: string) {
    handleSelectHospital(hospitalId);
    setDetailsHospitalId(hospitalId);
  }

  const bg = isDark ? '#0b1220' : '#f8fafc';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? 'rgba(241,245,249,0.65)' : 'rgba(15,23,42,0.6)';
  const borderColor = isDark ? '#1e293b' : '#e2e8f0';

  if (!isReady) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: mutedColor, fontFamily: 'system-ui, sans-serif' }}>
        Connecting to Lifeline dispatch…
      </div>
    );
  }

  if (!output || hospitals.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: mutedColor, fontFamily: 'system-ui, sans-serif' }}>
        No ranked hospitals available yet. Run <code>rank_hospitals</code> to populate this view.
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: maxHeight ?? 900,
        overflowY: 'auto',
        background: bg,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: textColor,
      }}
    >
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      <SeverityBanner
        severity={toolInput?.severity ?? null}
        emergencyType={toolInput?.required_capability ?? null}
        dispatchStartedAt={state?.dispatchStartedAt ?? null}
        isDark={isDark}
        onCallEmergency={handleCallEmergency}
      />

      <WorkflowTimeline
        routeStatus={isLoadingRoute ? 'loading' : routeError ? 'error' : route ? 'done' : 'idle'}
        reservationStatus={isReserving ? 'pending' : confirmedReservation ? 'done' : modalError ? 'error' : 'idle'}
        isDark={isDark}
      />

      <PatientSummary
        patient={toolInput?.patient ?? null}
        requiredCapability={toolInput?.required_capability ?? '—'}
        confidence={toolInput?.confidence ?? null}
        triageReasoning={toolInput?.triage_reasoning ?? null}
        origin={origin}
        isDark={isDark}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, margin: '8px 16px 0' }}>
        <button
          type="button"
          onClick={handleRetrySearch}
          disabled={isRetryingSearch}
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: isRetryingSearch ? mutedColor : textColor,
            background: 'transparent',
            border: `1px solid ${borderColor}`,
            borderRadius: 8,
            padding: '5px 10px',
            cursor: isRetryingSearch ? 'default' : 'pointer',
          }}
        >
          {isRetryingSearch ? '⏳ Searching…' : '🔄 Retry Search'}
        </button>
        <button
          type="button"
          onClick={handleShareLocation}
          style={{ fontSize: 11.5, fontWeight: 700, color: textColor, background: 'transparent', border: `1px solid ${borderColor}`, borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}
        >
          📍 Share Location
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', flex: 1, minHeight: 320, marginTop: 4 }}>
        <div style={{ flex: '1.1 1 320px', minHeight: 320, borderRight: `1px solid ${borderColor}`, borderTop: `1px solid ${borderColor}` }}>
          <MapView
            origin={origin}
            hospitals={hospitals}
            selectedHospitalId={selectedHospitalId}
            route={route?.route ?? null}
            onSelectHospital={handleSelectHospital}
          />
        </div>

        <div style={{ flex: '1 1 320px', padding: '12px 16px', background: bg }}>
          {routeError && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 12, color: '#dc2626', background: 'rgba(220,38,38,0.08)', borderRadius: 8, padding: '8px 10px' }}>
              <span>{routeError} — showing estimate unavailable.</span>
              <button type="button" onClick={() => setRouteRetryTick((t) => t + 1)} style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', background: 'transparent', border: '1px solid #dc262655', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>
                Retry
              </button>
            </div>
          )}

          {route && (
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10, fontSize: 11.5, color: mutedColor }}>
              <span>🛣 {route.route.properties.summary ?? 'Route calculated'}</span>
              <span>{route.distance_km.toFixed(1)} km · ~{route.eta_minutes} min travel time</span>
            </div>
          )}

          {selectedHospital && (
            <FeaturedHospitalCard
              hospital={selectedHospital}
              rank={selectedHospitalRank}
              isDark={isDark}
              onReserve={() => openReservationModal(selectedHospital.hospital_id)}
              onCallHospital={() => openCallDialog(selectedHospital.hospital_id)}
              onOpenNavigation={() => handleOpenNavigationFor(selectedHospital)}
            />
          )}
        </div>
      </div>

      {selectedHospital && toolInput && (
        <ExplainabilityPanel
          hospital={selectedHospital}
          allHospitals={hospitals}
          requiredCapability={toolInput.required_capability}
          rank={selectedHospitalRank}
          triageConfidence={toolInput.confidence ?? null}
          isDark={isDark}
        />
      )}

      <div style={{ margin: '14px 16px 0', fontSize: 12, fontWeight: 800, color: mutedColor }}>🏥 Hospital Ranking ({hospitals.length})</div>
      <div style={{ margin: '8px 16px 0' }}>
        <HospitalList
          hospitals={hospitals}
          selectedHospitalId={selectedHospitalId}
          isDark={isDark}
          isLoadingRoute={isLoadingRoute}
          onSelect={handleSelectHospital}
          onReserve={openReservationModal}
          onViewDetails={openDetailsModal}
        />
      </div>

      <ReservationPanel
        reservation={confirmedReservation}
        isDark={isDark}
        onShareReservation={handleShareReservation}
        onOpenNavigation={() => {
          if (!confirmedReservation) return;
          const target = hospitals.find((h) => h.hospital_id === confirmedReservation.hospital_id);
          if (target) handleOpenNavigationFor(target);
        }}
        onCallHospital={() => confirmedReservation && handleCallNowFor(confirmedReservation.hospital_phone_number)}
      />

      <SystemStatusPanel
        isConnected={isReady}
        mapStatus={hospitals.length > 0 ? 'ok' : 'idle'}
        routeStatus={isLoadingRoute ? 'warn' : routeError ? 'error' : route ? 'ok' : 'idle'}
        reservationStatus={isReserving ? 'warn' : confirmedReservation ? 'ok' : modalError ? 'error' : 'idle'}
        isDark={isDark}
      />

      <DeveloperPanel log={toolCallLog} isDark={isDark} />

      {reservingHospital && (
        <ReservationModal
          hospital={reservingHospital}
          isDark={isDark}
          isSubmitting={isReserving}
          error={modalError}
          result={confirmedReservation && confirmedReservation.hospital_id === reservingHospital.hospital_id ? confirmedReservation : null}
          etaMinutes={route?.eta_minutes ?? null}
          onClose={closeReservationModal}
          onSubmit={submitReservation}
          onShareReservation={handleShareReservation}
          onOpenNavigation={() => handleOpenNavigationFor(reservingHospital)}
          onCallHospital={() => handleCallNowFor(reservingHospital.phone_number)}
        />
      )}

      {callDialogHospital && (
        <CallHospitalDialog
          hospitalName={callDialogHospital.hospital_name}
          department={deriveDepartmentLabel(callDialogHospital, toolInput?.required_capability ?? 'General ER')}
          phoneNumber={callDialogHospital.phone_number}
          isDark={isDark}
          onClose={() => setCallDialogHospitalId(null)}
          onCallNow={() => {
            handleCallNowFor(callDialogHospital.phone_number);
            setCallDialogHospitalId(null);
          }}
        />
      )}

      {detailsHospital && output && (
        <HospitalDetailsModal
          hospital={detailsHospital}
          allHospitals={hospitals}
          requiredCapability={toolInput?.required_capability ?? 'General ER'}
          rank={hospitals.findIndex((h) => h.hospital_id === detailsHospital.hospital_id) + 1}
          weights={output.ranking_weights}
          isDark={isDark}
          onClose={() => setDetailsHospitalId(null)}
          onReserve={() => {
            setDetailsHospitalId(null);
            openReservationModal(detailsHospital.hospital_id);
          }}
          onCallHospital={() => openCallDialog(detailsHospital.hospital_id)}
          onOpenNavigation={() => handleOpenNavigationFor(detailsHospital)}
          onOpenMapsLink={(url) => {
            if (!safeOpenExternal(openExternal, url)) showToast('error', 'Unable to launch Maps.');
          }}
        />
      )}
    </div>
  );
}
