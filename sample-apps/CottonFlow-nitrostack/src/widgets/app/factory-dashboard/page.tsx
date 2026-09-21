'use client';

import { useWidgetSDK, useTheme, useMaxHeight, useDisplayMode } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface Machine {
  id: string;
  name: string;
  vibration: number;
  vibrationTrend: string;
  temperature: number;
  rpm: number;
  predictedFailureWindow: number | null;
  isHealthy: boolean;
  riskLevel: string;
  imageUrl: string;
}

interface Order {
  id: string;
  customerName: string;
  priority: string;
  quantity: number;
  dueDate: string;
  currentEta: string;
}

interface ProductionData {
  success: boolean;
  lineId: string;
  name: string;
  zone: string;
  status: string;
  currentBatchId: string;
  yarnBreakageRate: number;
  yarnBreakageTrend: string;
  isHealthy: boolean;
  riskLevel: string;
  associatedOrder: Order | null;
  imageUrl: string;
}

export default function FactoryDashboard() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const maxHeight = useMaxHeight();
  const displayMode = useDisplayMode();

  const data = getToolOutput<ProductionData>();

  if (!isReady || !data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: theme === 'dark' ? '#fff' : '#000',
        fontFamily: 'system-ui, sans-serif',
      }}>
        Loading factory dashboard...
      </div>
    );
  }

  if (!data.success) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: '#ef4444',
        fontFamily: 'system-ui, sans-serif',
      }}>
        Error: {data.success === false ? 'Failed to load production data' : 'Unknown error'}
      </div>
    );
  }

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const borderColor = isDark ? '#333' : '#e5e7eb';
  const textColor = isDark ? '#ffffff' : '#000000';
  const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'normal':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#dc2626';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'normal':
        return '✅';
      default:
        return '❓';
    }
  };

  return (
    <div style={{
      padding: '24px',
      background: isDark
        ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
        : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      borderRadius: '16px',
      fontFamily: 'system-ui, sans-serif',
      color: textColor,
      maxWidth: '900px',
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: `1px solid ${borderColor}`,
      }}>
        <h2 style={{
          margin: '0 0 8px 0',
          fontSize: '24px',
          fontWeight: 'bold',
          color: textColor,
        }}>
          🏭 Factory Dashboard
        </h2>
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: mutedColor,
        }}>
          Real-time production and machine health monitoring
        </p>
      </div>

      {/* Production Line Card */}
      <div style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        boxShadow: isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
        }}>
          {/* Line Image */}
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '8px',
            overflow: 'hidden',
            flexShrink: 0,
            background: '#e5e7eb',
          }}>
            {data.imageUrl ? (
              <img
                src={data.imageUrl}
                alt={data.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#d1d5db',
                color: '#6b7280',
                fontSize: '48px',
              }}>
                🏭
              </div>
            )}
          </div>

          {/* Line Details */}
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}>
              <div>
                <h3 style={{
                  margin: '0 0 4px 0',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: textColor,
                }}>
                  {data.name}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '12px',
                  color: mutedColor,
                }}>
                  {data.zone} • Batch: {data.currentBatchId}
                </p>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: getRiskColor(data.riskLevel),
                color: 'white',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
              }}>
                <span>{getRiskIcon(data.riskLevel)}</span>
                <span>{data.riskLevel.toUpperCase()}</span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}>
              <div style={{
                background: isDark ? '#2d2d2d' : '#f3f4f6',
                padding: '12px',
                borderRadius: '8px',
              }}>
                <div style={{
                  fontSize: '12px',
                  color: mutedColor,
                  marginBottom: '4px',
                }}>
                  Yarn Breakage
                </div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: getRiskColor(data.riskLevel),
                }}>
                  {data.yarnBreakageRate.toFixed(1)}%
                </div>
                <div style={{
                  fontSize: '11px',
                  color: mutedColor,
                  marginTop: '4px',
                }}>
                  Trend: {data.yarnBreakageTrend}
                </div>
              </div>

              <div style={{
                background: isDark ? '#2d2d2d' : '#f3f4f6',
                padding: '12px',
                borderRadius: '8px',
              }}>
                <div style={{
                  fontSize: '12px',
                  color: mutedColor,
                  marginBottom: '4px',
                }}>
                  Status
                </div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: data.isHealthy ? '#10b981' : '#ef4444',
                }}>
                  {data.status.toUpperCase()}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: mutedColor,
                  marginTop: '4px',
                }}>
                  {data.isHealthy ? 'Healthy' : 'At Risk'}
                </div>
              </div>

              <div style={{
                background: isDark ? '#2d2d2d' : '#f3f4f6',
                padding: '12px',
                borderRadius: '8px',
              }}>
                <div style={{
                  fontSize: '12px',
                  color: mutedColor,
                  marginBottom: '4px',
                }}>
                  Line ID
                </div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: textColor,
                }}>
                  {data.lineId}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: mutedColor,
                  marginTop: '4px',
                }}>
                  Production
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Associated Order Card */}
      {data.associatedOrder && (
        <div style={{
          background: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: '12px',
          padding: '16px',
          boxShadow: isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '14px',
            fontWeight: 'bold',
            color: textColor,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            📦 Associated Order
          </h4>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
          }}>
            <div>
              <div style={{
                fontSize: '12px',
                color: mutedColor,
                marginBottom: '4px',
              }}>
                Order ID
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: textColor,
              }}>
                {data.associatedOrder.id}
              </div>
            </div>

            <div>
              <div style={{
                fontSize: '12px',
                color: mutedColor,
                marginBottom: '4px',
              }}>
                Customer
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: textColor,
              }}>
                {data.associatedOrder.customerName}
              </div>
            </div>

            <div>
              <div style={{
                fontSize: '12px',
                color: mutedColor,
                marginBottom: '4px',
              }}>
                Priority
              </div>
              <div style={{
                display: 'inline-block',
                padding: '4px 8px',
                background: getPriorityBadgeColor(data.associatedOrder.priority),
                color: 'white',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}>
                {data.associatedOrder.priority.toUpperCase()}
              </div>
            </div>

            <div>
              <div style={{
                fontSize: '12px',
                color: mutedColor,
                marginBottom: '4px',
              }}>
                Quantity
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: textColor,
              }}>
                {data.associatedOrder.quantity} kg
              </div>
            </div>

            <div>
              <div style={{
                fontSize: '12px',
                color: mutedColor,
                marginBottom: '4px',
              }}>
                Due Date
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: textColor,
              }}>
                {new Date(data.associatedOrder.dueDate).toLocaleDateString()}
              </div>
            </div>

            <div>
              <div style={{
                fontSize: '12px',
                color: mutedColor,
                marginBottom: '4px',
              }}>
                ETA
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: textColor,
              }}>
                {new Date(data.associatedOrder.currentEta).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: '16px',
        paddingTop: '16px',
        borderTop: `1px solid ${borderColor}`,
        fontSize: '12px',
        color: mutedColor,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>🔄 Real-time monitoring • Last updated: {new Date().toLocaleTimeString()}</span>
        <span>Theme: {theme || 'light'} • Mode: {displayMode || 'default'}</span>
      </div>
    </div>
  );
}
