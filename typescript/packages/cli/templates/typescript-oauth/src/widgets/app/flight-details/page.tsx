'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

/**
 * Flight Details Widget - Compact view with segments, baggage, and fare conditions
 */

interface Segment {
    id: string;
    origin: string;
    destination: string;
    departingAt: string;
    arrivingAt: string;
    duration: string;
    airline: { name: string; code: string; flightNumber: string };
    aircraft?: string;
}

interface Slice {
    origin: { code: string; name: string; city: string };
    destination: { code: string; name: string; city: string };
    duration: string;
    segments: Segment[];
}

interface FlightDetailsData {
    id: string;
    totalAmount: string;
    totalCurrency: string;
    slices: Slice[];
    passengers: Array<{ id: string; type: string; baggageAllowance?: Array<{ type: string; quantity: number }> }>;
    conditions: {
        refundBeforeDeparture: { allowed: boolean; penaltyAmount?: string; penaltyCurrency?: string };
        changeBeforeDeparture: { allowed: boolean; penaltyAmount?: string; penaltyCurrency?: string };
    };
}

export default function FlightDetails() {
    const { getToolOutput } = useWidgetSDK();
    const theme = useTheme();
    const data = getToolOutput<FlightDetailsData>();

    const isDark = theme === 'dark';

    const formatDuration = (duration: string) => {
        const match = duration.match(/PT(\d+H)?(\d+M)?/);
        if (!match) return duration;
        const hours = match[1] ? parseInt(match[1]) : 0;
        const minutes = match[2] ? parseInt(match[2]) : 0;
        return `${hours}h ${minutes}m`;
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (!data) {
        return <div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>;
    }

    return (
        <div className={isDark ? 'dark' : ''} style={{
            padding: '16px',
            background: isDark ? '#020617' : '#FFFFFF',
            color: isDark ? '#F8FAFC' : '#020617'
        }}>
            {/* Header */}
            <div className="card" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Flight Details</h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: isDark ? '#94A3B8' : '#64748B' }}>
                            Offer ID: {data.id}
                        </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--primary)', fontSize: '24px', fontWeight: 700 }}>
                            {data.totalCurrency} {parseFloat(data.totalAmount).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '10px', color: isDark ? '#94A3B8' : '#64748B' }}>Total Price</div>
                    </div>
                </div>
            </div>

            {/* Flight Itinerary */}
            {data.slices.map((slice, sliceIndex) => (
                <div key={sliceIndex} className="card" style={{ marginBottom: '12px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>✈️</span>
                        <span>{slice.origin.city} → {slice.destination.city}</span>
                    </h3>

                    <div style={{
                        background: isDark ? '#0F172A' : '#F8FAFC',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '12px',
                        fontSize: '12px',
                        textAlign: 'center',
                        color: '#3B9FFF',
                        fontWeight: 600
                    }}>
                        Duration: {formatDuration(slice.duration)}
                    </div>

                    {/* Segments */}
                    {slice.segments.map((segment) => (
                        <div key={segment.id} style={{
                            background: isDark ? '#1F2937' : '#F9FAFB',
                            borderRadius: '8px',
                            padding: '12px',
                            marginBottom: '8px',
                            border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 600 }}>
                                    {segment.airline.name} {segment.airline.flightNumber}
                                </div>
                                <div style={{ fontSize: '11px', color: isDark ? '#94A3B8' : '#64748B' }}>
                                    {formatDuration(segment.duration)}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '18px', fontWeight: 700 }}>{formatTime(segment.departingAt)}</div>
                                    <div style={{ fontSize: '12px', color: isDark ? '#94A3B8' : '#64748B', marginTop: '2px' }}>
                                        {segment.origin}
                                    </div>
                                    <div style={{ fontSize: '10px', color: isDark ? '#64748B' : '#94A3B8', marginTop: '2px' }}>
                                        {formatDate(segment.departingAt)}
                                    </div>
                                </div>

                                <div style={{
                                    width: '40px',
                                    height: '2px',
                                    background: 'linear-gradient(90deg, #3B9FFF 0%, #2563EB 100%)',
                                    position: 'relative'
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        right: '-4px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: 0,
                                        height: 0,
                                        borderLeft: '6px solid #2563EB',
                                        borderTop: '3px solid transparent',
                                        borderBottom: '3px solid transparent'
                                    }} />
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '18px', fontWeight: 700 }}>{formatTime(segment.arrivingAt)}</div>
                                    <div style={{ fontSize: '12px', color: isDark ? '#94A3B8' : '#64748B', marginTop: '2px' }}>
                                        {segment.destination}
                                    </div>
                                    <div style={{ fontSize: '10px', color: isDark ? '#64748B' : '#94A3B8', marginTop: '2px' }}>
                                        {formatDate(segment.arrivingAt)}
                                    </div>
                                </div>
                            </div>

                            {segment.aircraft && (
                                <div style={{
                                    marginTop: '10px',
                                    paddingTop: '10px',
                                    borderTop: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
                                    fontSize: '11px',
                                    color: isDark ? '#94A3B8' : '#64748B'
                                }}>
                                    ✈️ {segment.aircraft}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ))}

            {/* Baggage */}
            <div className="card" style={{ marginBottom: '12px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🧳</span>
                    <span>Baggage Allowance</span>
                </h3>
                {data.passengers.map((passenger, index) => (
                    <div key={passenger.id} style={{
                        background: isDark ? '#0F172A' : '#F8FAFC',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: index < data.passengers.length - 1 ? '8px' : '0'
                    }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                            Passenger {index + 1} ({passenger.type})
                        </div>
                        {passenger.baggageAllowance && passenger.baggageAllowance.length > 0 ? (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {passenger.baggageAllowance.map((bag, bagIndex) => (
                                    <span key={bagIndex} className="badge badge-info" style={{ fontSize: '11px' }}>
                                        {bag.quantity}x {bag.type.replace('_', ' ')}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div style={{ fontSize: '11px', color: isDark ? '#94A3B8' : '#64748B' }}>
                                No baggage info
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Fare Conditions */}
            {data.conditions && (
                <div className="card">
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📋</span>
                        <span>Fare Conditions</span>
                    </h3>
                    <div style={{ display: 'grid', gap: '8px' }}>
                        <div className={data.conditions.refundBeforeDeparture?.allowed ? 'badge-success' : 'badge-warning'} style={{
                            padding: '12px',
                            borderRadius: '8px'
                        }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                                {data.conditions.refundBeforeDeparture?.allowed ? '✓' : '✗'} Refund Before Departure
                            </div>
                            {data.conditions.refundBeforeDeparture?.penaltyAmount && (
                                <div style={{ fontSize: '10px', opacity: 0.8 }}>
                                    Penalty: {data.conditions.refundBeforeDeparture.penaltyCurrency} {data.conditions.refundBeforeDeparture.penaltyAmount}
                                </div>
                            )}
                        </div>

                        <div className={data.conditions.changeBeforeDeparture?.allowed ? 'badge-success' : 'badge-warning'} style={{
                            padding: '12px',
                            borderRadius: '8px'
                        }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                                {data.conditions.changeBeforeDeparture?.allowed ? '✓' : '✗'} Changes Before Departure
                            </div>
                            {data.conditions.changeBeforeDeparture?.penaltyAmount && (
                                <div style={{ fontSize: '10px', opacity: 0.8 }}>
                                    Penalty: {data.conditions.changeBeforeDeparture.penaltyCurrency} {data.conditions.changeBeforeDeparture.penaltyAmount}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
