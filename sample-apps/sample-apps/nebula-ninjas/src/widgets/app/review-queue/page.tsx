'use client';

import React, { useEffect, useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { executeGatewayTool } from '../../utils/gatewayClient';
import { StatusBadge } from '../../components/StatusBadge';
import { DiffViewer } from '../../components/DiffViewer';
import { AlertOctagon, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

interface ReviewQueueItem {
  id: string;
  type: string;
  serverName: string;
  toolName: string;
  reason: string;
  status: string;
  createdAt: string;
  details: {
    oldDescription?: string;
    newDescription?: string;
    injectionScan?: {
      score?: number;
      patterns?: string[];
      details?: string;
    };
    [key: string]: unknown;
  };
}

export default function ReviewQueueWidget() {
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const initialData = getToolOutput<{ items: ReviewQueueItem[] }>();
  const [items, setItems] = useState<ReviewQueueItem[]>(initialData?.items || []);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      const res = (await executeGatewayTool('get_review_queue', {}, callTool, isReady)) as { items: ReviewQueueItem[] };
      if (res?.items) {
        setItems(res.items);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await executeGatewayTool('approve_review', { itemId: id }, callTool, isReady);
      await fetchQueue();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async (id: string) => {
    setActionLoading(id);
    try {
      await executeGatewayTool('deny_review', { itemId: id }, callTool, isReady);
      await fetchQueue();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (initialData?.items) {
      setItems(initialData.items);
    }
  }, [initialData]);

  useEffect(() => {
    fetchQueue();
  }, []);

  const pendingItems = items.filter((i) => i.status === 'PENDING');

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-slate-100">Human Approval & Review Queue</h2>
          <span className="bg-amber-950 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full text-xs font-mono">
            {pendingItems.length} Pending
          </span>
        </div>

        <button
          onClick={fetchQueue}
          className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
          title="Refresh Queue"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Queue items */}
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-10 text-slate-500 glass-panel">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400/50" />
            <p className="text-sm">No items in the review queue. All tools and calls are operating normally.</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`glass-panel p-4 space-y-3 ${
                item.status === 'PENDING' ? 'border-amber-500/30 glow-cyan' : 'opacity-75'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.status} />
                    <span className="font-mono text-xs text-sky-400 font-bold">
                      [{item.type}] {item.serverName}/{item.toolName}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 font-medium">{item.reason}</p>
                </div>

                {/* Actions */}
                {item.status === 'PENDING' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(item.id)}
                      disabled={actionLoading === item.id}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-md flex items-center gap-1 transition-colors shadow"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve & Re-Pin
                    </button>
                    <button
                      onClick={() => handleDeny(item.id)}
                      disabled={actionLoading === item.id}
                      className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold rounded-md flex items-center gap-1 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      Deny Block
                    </button>
                  </div>
                )}
              </div>

              {/* Details Diff view if available */}
              {(item.details?.oldDescription || item.details?.newDescription) && (
                <div className="pt-2">
                  <DiffViewer
                    oldText={item.details.oldDescription}
                    newText={item.details.newDescription}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
