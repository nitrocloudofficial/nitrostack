'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { useState } from 'react';



interface ActionItem {
  task: string;
  owner: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface ActionItemsData {
  items: ActionItem[];
  meetingTitle: string;
}

type SortField = 'task' | 'owner' | 'deadline' | 'priority';
type SortOrder = 'asc' | 'desc';

export default function ActionItemsTable() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const [sortField, setSortField] = useState<SortField>('deadline');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const data = getToolOutput<ActionItemsData>();

  if (!isReady || !data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: theme === 'dark' ? '#fff' : '#000',
      }}>
        Loading…
      </div>
    );
  }

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1f2937' : '#ffffff';
  const borderColor = isDark ? '#374151' : '#e5e7eb';
  const textColor = isDark ? '#ffffff' : '#000000';
  const mutedColor = isDark ? '#9ca3af' : '#6b7280';
  const headerBg = isDark ? '#111827' : '#f9fafb';

  const priorityColors: Record<string, { bg: string; text: string }> = {
    critical: { bg: isDark ? '#7f1d1d' : '#fee2e2', text: isDark ? '#fca5a5' : '#dc2626' },
    high: { bg: isDark ? '#7c2d12' : '#fed7aa', text: isDark ? '#fdba74' : '#ea580c' },
    medium: { bg: isDark ? '#3f3f00' : '#fef3c7', text: isDark ? '#facc15' : '#d97706' },
    low: { bg: isDark ? '#1e3a1f' : '#dcfce7', text: isDark ? '#86efac' : '#16a34a' }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedItems = [...(data.items ?? [])].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (sortField === 'deadline') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    } else if (sortField === 'priority') {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      aVal = priorityOrder[aVal as keyof typeof priorityOrder] || 0;
      bVal = priorityOrder[bVal as keyof typeof priorityOrder] || 0;
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div style={{
      padding: '24px',
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: '12px',
      maxWidth: '900px',
      boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '20px',
        borderBottom: `1px solid ${borderColor}`,
        paddingBottom: '16px',
      }}>
        <h2 style={{
          margin: '0 0 4px 0',
          fontSize: '18px',
          fontWeight: '600',
          color: textColor,
        }}>
          ✅ Action Items
        </h2>
        <p style={{
          margin: 0,
          fontSize: '13px',
          color: mutedColor,
        }}>
          {data.meetingTitle} • {sortedItems.length} item{sortedItems.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Table */}
      {sortedItems.length > 0 ? (
        <div style={{
          overflowX: 'auto',
          borderRadius: '8px',
          border: `1px solid ${borderColor}`,
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px',
          }}>
            <thead>
              <tr>
                <th
                  onClick={() => handleSort('task')}
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: mutedColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    cursor: 'pointer',
                    background: headerBg,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  Task {sortField === 'task' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('owner')}
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: mutedColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    cursor: 'pointer',
                    background: headerBg,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  Owner {sortField === 'owner' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('deadline')}
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: mutedColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    cursor: 'pointer',
                    background: headerBg,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  Deadline {sortField === 'deadline' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('priority')}
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: mutedColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    cursor: 'pointer',
                    background: headerBg,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  Priority {sortField === 'priority' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item, idx) => {
                const deadline = new Date(item.deadline);
                const now = new Date();
                const isOverdue = deadline < now;
                const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const priorityColor = priorityColors[item.priority];

                return (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: `1px solid ${borderColor}`,
                    }}
                  >
                    <td style={{
                      padding: '12px',
                      color: textColor,
                      fontWeight: '500',
                      maxWidth: '300px',
                      wordBreak: 'break-word',
                    }}>
                      {item.task}
                    </td>
                    <td style={{
                      padding: '12px',
                      color: mutedColor,
                    }}>
                      {item.owner}
                    </td>
                    <td style={{
                      padding: '12px',
                      color: isOverdue ? '#ef4444' : textColor,
                      fontWeight: isOverdue ? '600' : '400',
                    }}>
                      <div>{deadline.toLocaleDateString()}</div>
                      <div style={{
                        fontSize: '11px',
                        color: mutedColor,
                        marginTop: '2px',
                      }}>
                        {isOverdue
                          ? `${Math.abs(daysUntil)} days overdue ⚠️`
                          : daysUntil === 0
                          ? 'Due today'
                          : `${daysUntil} day${daysUntil !== 1 ? 's' : ''} left`}
                      </div>
                    </td>
                    <td style={{
                      padding: '12px',
                    }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        background: priorityColor.bg,
                        color: priorityColor.text,
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        {item.priority}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{
          padding: '32px',
          textAlign: 'center',
          color: mutedColor,
        }}>
          <p style={{ margin: 0, fontSize: '14px' }}>
            No action items yet. Extract action items from a meeting transcript to get started.
          </p>
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: '16px',
        paddingTop: '12px',
        borderTop: `1px solid ${borderColor}`,
        fontSize: '12px',
        color: mutedColor,
        textAlign: 'center',
      }}>
        💡 Click column headers to sort
      </div>
    </div>
  );
}
