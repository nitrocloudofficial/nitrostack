'use client';

import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

import { SpeechNode } from '../../components/canvas/SpeechNode';
import { SupervisorNode } from '../../components/canvas/SupervisorNode';
import { HistoryNode } from '../../components/canvas/HistoryNode';
import { MedicationNode } from '../../components/canvas/MedicationNode';
import { ResearchNode } from '../../components/canvas/ResearchNode';
import { GapNode } from '../../components/canvas/GapNode';
import { ReportNode } from '../../components/canvas/ReportNode';

export default function ClinicalCanvasWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const theme = useTheme();
  const isDark = theme === 'dark';

  const toolOutput = getToolOutput<any>();
  const orchestrationData = toolOutput?.data || toolOutput || {};
  const nodes = orchestrationData.nodes || [];
  const edges = orchestrationData.edges || [];

  const nodeTypes = useMemo(() => ({
    speech: SpeechNode,
    supervisor: SupervisorNode,
    history: HistoryNode,
    medication: MedicationNode,
    research: ResearchNode,
    gap: GapNode,
    report: ReportNode
  }), []);

  if (!isReady && nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[700px] bg-slate-950 text-slate-400 font-mono">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3"></div>
        <span>Initializing ClinicaMind Intelligence Canvas...</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[750px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2 text-xs font-mono text-slate-300">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        <span className="font-bold text-indigo-400">ClinicaMind Canvas Workspace</span>
        <span className="text-slate-500">|</span>
        <span>{nodes.length} Agent Nodes Active</span>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        nodesFocusable={true}
        edgesFocusable={true}
        className="bg-slate-950"
      >
        <Background color="#334155" gap={20} size={1} />
        <Controls className="!bg-slate-900 !border-slate-800 !text-slate-200" />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'speech': return '#6366f1';
              case 'supervisor': return '#a855f7';
              case 'history': return '#3b82f6';
              case 'medication': return '#f59e0b';
              case 'research': return '#14b8a6';
              case 'gap': return '#06b6d4';
              case 'report': return '#10b981';
              default: return '#64748b';
            }
          }}
          className="!bg-slate-900/90 !border-slate-800 rounded-lg"
        />
      </ReactFlow>
    </div>
  );
}
