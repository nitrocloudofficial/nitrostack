import { createContext, useContext, useMemo, useState } from 'react';
import type { FocusContext as FocusState, FocusOrigin } from './types';
import { useWorkbenchData } from './WorkbenchDataContext';

type FocusContextValue = {
  focus: FocusState;
  focusEvent: (eventId: string, origin?: FocusOrigin, aiLabel?: string) => void;
  focusStage: (stageId: string, origin?: FocusOrigin) => void;
  focusGraphNode: (nodeId: string, origin?: FocusOrigin) => void;
  focusEvidenceRefs: (refs: string[], aiLabel?: string) => void;
  setReplayTime: (minute: number) => void;
  setPinned: (pinned: boolean) => void;
  clearFocus: () => void;
};

const initialFocus: FocusState = {
  incidentId: 'INC-2407-001',
  eventId: null,
  stageId: 'stage-intake',
  graphNodeIds: [],
  evidenceIds: [],
  timeMinute: 0,
  timeRange: null,
  pinned: false,
  origin: 'user',
  aiLabel: null,
};

const FocusContext = createContext<FocusContextValue | undefined>(undefined);

function resolveEvent(
  eventId: string,
  origin: FocusOrigin,
  aiLabel: string | null,
  incidentEvents: ReturnType<typeof useWorkbenchData>['data']['incidentEvents'],
): FocusState {
  const event = incidentEvents.find((item) => item.id === eventId);
  if (!event) return { ...initialFocus, origin, aiLabel };
  return {
    incidentId: initialFocus.incidentId,
    eventId: event.id,
    stageId: event.stageId,
    graphNodeIds: event.graphNodeIds,
    evidenceIds: event.evidenceIds,
    timeMinute: event.offsetMinutes,
    timeRange: [Math.max(0, event.offsetMinutes - 5), Math.min(229, event.offsetMinutes + 5)],
    pinned: false,
    origin,
    aiLabel,
  };
}

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const [focus, setFocus] = useState<FocusState>(initialFocus);
  const { data } = useWorkbenchData();
  const { graphNodes, incidentEvents, replayStages } = data;

  const value = useMemo<FocusContextValue>(() => ({
    focus,
    focusEvent(eventId, origin = 'user', aiLabel) {
      setFocus(resolveEvent(eventId, origin, aiLabel ?? null, incidentEvents));
    },
    focusStage(stageId, origin = 'user') {
      const stage = replayStages.find((item) => item.id === stageId);
      if (!stage) return;
      const event = incidentEvents.find((item) => stage.eventIds.includes(item.id));
      const nodes = [...new Set(stage.eventIds.flatMap((id) => incidentEvents.find((item) => item.id === id)?.graphNodeIds ?? []))];
      const evidence = [...new Set(stage.eventIds.flatMap((id) => incidentEvents.find((item) => item.id === id)?.evidenceIds ?? []))];
      setFocus((previous) => ({
        ...previous,
        eventId: event?.id ?? null,
        stageId,
        graphNodeIds: nodes,
        evidenceIds: evidence,
        timeMinute: stage.startMinute,
        timeRange: [stage.startMinute, stage.endMinute],
        origin,
        aiLabel: null,
      }));
    },
    focusGraphNode(nodeId, origin = 'user') {
      const node = graphNodes.find((item) => item.id === nodeId);
      if (!node) return;
      const event = incidentEvents.find((item) => node.eventIds.includes(item.id));
      setFocus((previous) => ({
        ...previous,
        eventId: event?.id ?? previous.eventId,
        stageId: event?.stageId ?? previous.stageId,
        graphNodeIds: [node.id],
        evidenceIds: node.evidenceIds,
        timeMinute: event?.offsetMinutes ?? previous.timeMinute,
        timeRange: event ? [Math.max(0, event.offsetMinutes - 5), Math.min(229, event.offsetMinutes + 5)] : previous.timeRange,
        origin,
        aiLabel: null,
      }));
    },
    focusEvidenceRefs(refs, aiLabel) {
      const eventIds = refs.filter((ref) => ref.startsWith('timeline:')).map((ref) => ref.replace('timeline:', ''));
      const nodeIds = refs.filter((ref) => ref.startsWith('graph:')).map((ref) => ref.replace('graph:', ''));
      const simulationIds = refs
        .filter((ref) => ref.startsWith('sim:'))
        .map((ref) => `evidence-sim-${ref.replace(/^sim:/, '')}`);
      const event = incidentEvents.find((item) => eventIds.includes(item.id))
        ?? incidentEvents.find((item) => item.graphNodeIds.some((id) => nodeIds.includes(id)));
      const nodes = nodeIds.length ? nodeIds : event?.graphNodeIds ?? [];
      const nodeEvidence = nodes.flatMap((id) => graphNodes.find((item) => item.id === id)?.evidenceIds ?? []);
      const eventEvidence = event?.evidenceIds ?? [];
      setFocus((previous) => ({
        ...previous,
        eventId: event?.id ?? previous.eventId,
        stageId: event?.stageId ?? previous.stageId,
        graphNodeIds: [...new Set(nodes)],
        evidenceIds: [...new Set([...eventEvidence, ...nodeEvidence, ...simulationIds].filter(Boolean))],
        timeMinute: event?.offsetMinutes ?? previous.timeMinute,
        timeRange: event ? [Math.max(0, event.offsetMinutes - 5), Math.min(229, event.offsetMinutes + 5)] : previous.timeRange,
        origin: 'assistant',
        aiLabel: aiLabel ?? 'AI-selected evidence',
      }));
    },
    setReplayTime(minute) {
      const duration = Math.max(
        1,
        ...replayStages.map((stage) => stage.endMinute),
        ...incidentEvents.map((event) => event.offsetMinutes),
      );
      const safeMinute = Math.max(0, Math.min(duration, Math.round(minute)));
      const stage = [...replayStages].reverse().find((item) => safeMinute >= item.startMinute)
        ?? replayStages[replayStages.length - 1];
      const event = [...incidentEvents].reverse().find((item) => item.offsetMinutes <= safeMinute);
      const nodes = event?.graphNodeIds ?? [];
      setFocus((previous) => previous.pinned ? previous : {
        ...previous,
        eventId: event?.id ?? null,
        stageId: stage.id,
        graphNodeIds: nodes,
        evidenceIds: event?.evidenceIds ?? [],
        timeMinute: safeMinute,
        timeRange: [safeMinute, Math.min(duration, safeMinute + 1)],
        origin: 'replay',
        aiLabel: null,
      });
    },
    setPinned(pinned) {
      setFocus((previous) => ({ ...previous, pinned }));
    },
    clearFocus() {
      setFocus(initialFocus);
    },
  }), [focus, graphNodes, incidentEvents, replayStages]);

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocusContext() {
  const context = useContext(FocusContext);
  if (!context) throw new Error('useFocusContext must be used within FocusProvider');
  return context;
}
