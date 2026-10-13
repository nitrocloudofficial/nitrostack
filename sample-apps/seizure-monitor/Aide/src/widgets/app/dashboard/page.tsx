'use client';

import './dashboard.css';
import { useEffect, useState } from 'react';

interface SchedulingResult {
  time: string;
  attendees: string[];
  duration: number;
  confidence: 'high' | 'medium' | 'low';
}

interface DelegationResult {
  taskId: string;
  owner: string;
  deadline: string;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
}

interface AdminResult {
  approved: boolean;
  reason: string;
  escalationRequired: boolean;
}

interface AiData {
  request: string;
  scheduling: SchedulingResult | null;
  delegation: DelegationResult | null;
  admin: AdminResult | null;
  message: { text: string; channel: string; format: string };
  timestamp: string;
}

const defaultData: AiData = {
  request: 'Book a meeting with eng and design for incident war-room, assign someone to write postmortem by Friday, and post update to #incidents.',
  scheduling: {
    time: '2025-01-15T14:00:00Z',
    attendees: ['alice', 'bob', 'charlie'],
    duration: 60,
    confidence: 'high',
  },
  delegation: {
    taskId: 'task-001',
    owner: 'alice',
    deadline: '2025-01-17T17:00:00Z',
    priority: 'high',
    reasoning: 'Alice has lowest workload on incident response',
  },
  admin: {
    approved: true,
    reason: 'Request within policy limits',
    escalationRequired: false,
  },
  message: {
    text: '🚨 Incident war-room scheduled\n📅 Tuesday, Jan 15 at 2:00 PM UTC\n👥 Attendees: Alice (Eng), Bob (Design), Charlie (Support)\n📝 Alice owns postmortem doc, due Friday\n\nStatus: In Progress | Confidence: High',
    channel: '#incidents',
    format: 'slack',
  },
  timestamp: new Date().toISOString(),
};

export default function DashboardPage() {
  const [data, setData] = useState<AiData>(defaultData);
  const [processing, setProcessing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<'idle' | 'updated'>('idle');

  async function fetchLatest() {
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      const json = await res.json();
      if (json.data && json.lastUpdated !== lastUpdated) {
        setData(json.data);
        setLastUpdated(json.lastUpdated);
        setLiveStatus('updated');
        // Flash the "updated" indicator then reset
        setTimeout(() => setLiveStatus('idle'), 3000);
      }
    } catch {
      // silently ignore poll errors
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchLatest();
    // Poll every 3 seconds
    const interval = setInterval(fetchLatest, 3000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const confidenceBadge = (c: string) =>
    c === 'high' ? 'approved' : c === 'medium' ? 'medium' : 'low';

  const priorityBadge = (p: string) =>
    p === 'high' ? 'high' : p === 'medium' ? 'medium' : 'low';

  return (
    <div className="container">
      <div className="header">
        <div className="logo">
          <div className="logo-icon">⚡</div>
          <div className="logo-text">Aide</div>
        </div>
        <p className="tagline">AI Chief of Staff — Coordinating your team in real time</p>
        <div className="live-bar">
          <span className={`live-dot ${liveStatus === 'updated' ? 'flash' : ''}`}></span>
          <span className="live-label">
            {liveStatus === 'updated' ? '✦ Dashboard updated' : 'Live — polling every 3s'}
          </span>
          {lastUpdated && (
            <span className="live-time">Last update: {new Date(lastUpdated).toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      <div className="dashboard">
        {/* Request Card */}
        <div className="card full-width">
          <h3>Request</h3>
          <div className="request-text">{data.request}</div>
          <div className="status">
            <span className={`status-dot${processing ? ' processing' : ''}`}></span>
            <span>{processing ? 'Processing request through specialist agents...' : 'Request processed'}</span>
            {processing && <span className="spinner"></span>}
          </div>
        </div>

        {/* Scheduling Card */}
        {data.scheduling && (
          <div className="card">
            <h3>Meeting Scheduled</h3>
            <div className="card-content">
              <div className="row">
                <span className="label">Date &amp; Time</span>
                <span className="value" id="meeting-time">{data.scheduling.time}</span>
              </div>
              <div className="row">
                <span className="label">Duration</span>
                <span className="value" id="meeting-duration">{data.scheduling.duration} minutes</span>
              </div>
              <div className="row">
                <span className="label">Confidence</span>
                <span className={`badge ${confidenceBadge(data.scheduling.confidence)}`} id="meeting-confidence">
                  {data.scheduling.confidence}
                </span>
              </div>
              <div className="row">
                <span className="label">Attendees</span>
              </div>
              <div className="attendees-list" id="meeting-attendees">
                {data.scheduling.attendees.map((name) => (
                  <div className="attendee" key={name}>
                    <div className="attendee-avatar">{name[0].toUpperCase()}</div>
                    <span>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Delegation Card */}
        {data.delegation && (
          <div className="card">
            <h3>Task Assigned</h3>
            <div className="card-content">
              <div className="row">
                <span className="label">Owner</span>
                <span className="value primary" id="task-owner">{data.delegation.owner}</span>
              </div>
              <div className="row">
                <span className="label">Task ID</span>
                <span className="value">{data.delegation.taskId}</span>
              </div>
              <div className="row">
                <span className="label">Due Date</span>
                <span className="value" id="task-deadline">{data.delegation.deadline.split('T')[0]}</span>
              </div>
              <div className="row">
                <span className="label">Priority</span>
                <span className={`badge ${priorityBadge(data.delegation.priority)}`} id="task-priority">
                  {data.delegation.priority}
                </span>
              </div>
              <div className="row">
                <span className="label">Reason</span>
                <span className="value" id="task-reason">{data.delegation.reasoning}</span>
              </div>
            </div>
          </div>
        )}

        {/* Admin Decision Card */}
        {data.admin && (
          <div className="card">
            <h3>Admin Decision</h3>
            <div className="card-content">
              <div className="row">
                <span className="label">Status</span>
                <span className={`badge ${data.admin.approved ? 'approved' : 'rejected'}`} id="admin-status">
                  {data.admin.approved ? 'APPROVED' : 'REJECTED'}
                </span>
              </div>
              <div className="row">
                <span className="label">Reason</span>
                <span className="value" id="admin-reason">{data.admin.reason}</span>
              </div>
              <div className="row">
                <span className="label">Escalation</span>
                <span className="value">{data.admin.escalationRequired ? 'Required' : 'Not required'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Message Preview Card */}
        {data.message && (
          <div className="card full-width">
            <h3>Posted to {data.message.channel}</h3>
            <div className="message-preview">{data.message.text}</div>
          </div>
        )}
      </div>

      <div className="footer">
        <p>Aide coordinated this outcome in under 30 seconds • Powered by specialist AI agents</p>
      </div>
    </div>
  );
}
