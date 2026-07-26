'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { WorkflowNode } from '../../types';
import { 
  GitMerge, 
  RotateCcw, 
  Terminal, 
  ArrowRight,
  CheckCircle2,
  Play
} from 'lucide-react';
import { motion } from 'framer-motion';

export const VisualWorkflowCanvas: React.FC = () => {
  const { workflowNodes, selectedPack, triggerNodeProgression } = useApp();
  const [selectedNode, setSelectedNode] = useState<WorkflowNode>(workflowNodes[3] || workflowNodes[0]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <GitMerge className="w-6 h-6 text-indigo-400" />
            <h1 className="text-2xl font-extrabold text-white">Visual MCP Workflow Canvas</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Pipeline: Transcript → Context Pack Engine → AI Planner → Human Approval → MCP Router → Integrations → ChromaDB
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            Pack: <strong className="text-indigo-300">{selectedPack.name}</strong>
          </span>
          <button 
            onClick={triggerNodeProgression}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs rounded-xl flex items-center space-x-2 shadow-lg shadow-emerald-600/20 transition-all"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Simulate Full Node 1-7 Approval Flow</span>
          </button>
        </div>
      </div>

      {/* Visual Node Flow Horizontal Canvas */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-x-auto">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center justify-between min-w-[900px]">
          <span>Node Execution Diagram (Live Dynamic Workflow)</span>
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
            MCP Microservice Route Active
          </span>
        </div>

        <div className="flex items-center justify-between min-w-[950px] space-x-3 py-4">
          {workflowNodes.map((node, idx) => {
            const isSelected = selectedNode.id === node.id;

            return (
              <React.Fragment key={node.id}>
                {/* Node Box */}
                <motion.div
                  onClick={() => setSelectedNode(node)}
                  whileHover={{ scale: 1.03 }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all w-48 relative flex-shrink-0 ${
                    isSelected
                      ? 'bg-gradient-to-br from-indigo-900/60 to-violet-900/60 border-indigo-500 shadow-xl shadow-indigo-500/20 ring-2 ring-indigo-500/40'
                      : node.status === 'completed'
                      ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      : node.status === 'running'
                      ? 'bg-indigo-950/40 border-indigo-500/80 animate-pulse'
                      : 'bg-slate-950/40 border-slate-900 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-slate-400">Node 0{idx + 1}</span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      node.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                      node.status === 'running' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {node.status}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-white mb-2 line-clamp-1">{node.name}</div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800 mb-2">
                    <div 
                      className={`h-full transition-all duration-500 ${node.status === 'completed' ? 'bg-emerald-400' : node.status === 'running' ? 'bg-indigo-400' : 'bg-slate-700'}`}
                      style={{ width: `${node.progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Duration: {node.duration}</span>
                    <span>Retries: {node.retryCount}</span>
                  </div>
                </motion.div>

                {/* Arrow Connecting Line */}
                {idx < workflowNodes.length - 1 && (
                  <div className="flex items-center text-slate-600 flex-shrink-0">
                    <ArrowRight className={`w-5 h-5 ${node.status === 'completed' ? 'text-indigo-400' : 'text-slate-700'}`} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Selected Node Details & Live Terminal Logs Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Selected Node Metadata (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Node Inspector: {selectedNode.name}
            </h3>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              ID: {selectedNode.id}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Type</span>
              <span className="font-semibold text-white uppercase">{selectedNode.type}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Status</span>
              <span className={`font-semibold uppercase ${selectedNode.status === 'completed' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                {selectedNode.status}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Execution Duration</span>
              <span className="font-semibold text-slate-200">{selectedNode.duration}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Retry Counter</span>
              <span className="font-semibold text-slate-200">{selectedNode.retryCount} retries</span>
            </div>
          </div>

          <button 
            onClick={triggerNodeProgression}
            className="w-full py-2 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center space-x-2"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
            <span>Force Re-execute Pipeline</span>
          </button>
        </div>

        {/* Right: Live Terminal Log Console (8 cols) */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl font-mono text-xs text-slate-300 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 text-indigo-400">
              <Terminal className="w-4 h-4" />
              <span className="font-bold uppercase tracking-wider text-slate-300">
                Real-Time Node Terminal Stream: {selectedNode.name}
              </span>
            </div>
            <span className="text-[10px] text-slate-500">FastAPI Orchestrator Stream</span>
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto bg-slate-900/60 p-4 rounded-xl border border-slate-850">
            {selectedNode.logs.map((log, idx) => (
              <div key={idx} className="flex items-start space-x-2">
                <span className="text-indigo-500 font-bold select-none">&gt;</span>
                <span className="text-slate-300">{log}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
