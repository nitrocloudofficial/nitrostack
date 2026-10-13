'use client';

import React, { useState } from 'react';
import { MOCK_TASKS } from '../mockData';
import { Task } from '../../shared/interfaces/Task.interface';
import { TaskStatus } from '../../shared/enums/task.enum';
import { PriorityLevel } from '../../shared/enums/priority.enum';

function formatTimeString(dateInput: Date | string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

export interface TaskWidgetProps {
  tasks?: Task[];
  onToggleTask?: (taskId: string) => void;
}

export const TaskWidget: React.FC<TaskWidgetProps> = ({
  tasks = MOCK_TASKS,
  onToggleTask
}) => {
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'completed'>('today');

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === 'completed') return t.status === TaskStatus.COMPLETED;
    if (activeTab === 'today') return t.status !== TaskStatus.COMPLETED;
    return t.status !== TaskStatus.COMPLETED;
  });

  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case PriorityLevel.URGENT: return { label: 'URGENT', color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)' };
      case PriorityLevel.HIGH: return { label: 'HIGH', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)' };
      case PriorityLevel.MEDIUM: return { label: 'MED', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' };
      default: return { label: 'LOW', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' };
    }
  };

  return (
    <div
      style={{
        background: 'rgba(19, 25, 39, 0.7)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '20px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Header & Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>📋</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
              Extracted Action Items & Tasks
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Extracted by Task Agent from multi-channel messages & commitments
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', background: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: '8px' }}>
          {(['today', 'upcoming', 'completed'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                background: activeTab === t ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                border: activeTab === t ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                color: activeTab === t ? '#38bdf8' : '#94a3b8',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: activeTab === t ? 600 : 500,
                textTransform: 'capitalize',
                cursor: 'pointer'
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredTasks.map((t) => {
          const prio = getPriorityBadge(t.priority);
          const isDone = t.status === TaskStatus.COMPLETED;

          return (
            <div
              key={t.id}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                opacity: isDone ? 0.6 : 1
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexGrow: 1 }}>
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => onToggleTask && onToggleTask(t.id)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#38bdf8' }}
                />

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: isDone ? '#94a3b8' : '#f1f5f9', textDecoration: isDone ? 'line-through' : 'none' }}>
                      {t.title}
                    </span>
                    <span style={{ fontSize: '10px', background: prio.bg, color: prio.color, padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      {prio.label}
                    </span>
                    {t.sourcePlatform && (
                      <span style={{ fontSize: '10px', background: 'rgba(255, 255, 255, 0.06)', color: '#cbd5e1', padding: '1px 6px', borderRadius: '4px' }}>
                        Source: {t.sourcePlatform}
                      </span>
                    )}
                  </div>

                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    {t.description}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                {t.dueDate && (
                  <span style={{ fontSize: '11px', color: '#fca5a5', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '6px', fontWeight: 500 }}>
                    📅 {formatTimeString(t.dueDate)}
                  </span>
                )}
                <span style={{ fontSize: '10px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                  🤖 Task Agent
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
