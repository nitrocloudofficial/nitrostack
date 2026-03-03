'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

/**
 * Order Summary Widget - Compact booking confirmation
 */

interface OrderData {
    orderId: string;
    status: string;
    bookingReference?: string;
    totalAmount: string;
    totalCurrency: string;
    createdAt?: string;
    expiresAt?: string;
    passengers: Array<{ id: string; name: string; type: string; email?: string }>;
    slices: Array<{
        origin: { code: string; city?: string };
        destination: { code: string; city?: string };
        segments?: Array<{ airline: string; flightNumber: string }>;
    }>;
    message?: string;
}

export default function OrderSummary() {
    const { getToolOutput } = useWidgetSDK();
    const theme = useTheme();
    const data = getToolOutput<OrderData>();

    const isDark = theme === 'dark';

    const formatDateTime = (isoString: string) => {
        return new Date(isoString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusIcon = (status: string) => {
        return { 'confirmed': '🎉', 'held': '⏱️', 'cancelled': '✗', 'pending': '⋯' }[status.toLowerCase()] || '📋';
    };

    if (!data) {
        return <div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>;
    }

    return (
        <div className={isDark ? 'dark' : ''} style={{
            padding: '16px',
            background: isDark ? '#020617' : '#ffffff',
            color: isDark ? '#F8FAFC' : '#020617'
        }}>
            {/* Header */}
            <div className="card" style={{ marginBottom: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>
                    {getStatusIcon(data.status)}
                </div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
                    {data.status === 'confirmed' ? 'Booking Confirmed!' :
                        data.status === 'held' ? 'Order On Hold' : 'Order Summary'}
                </h2>

                {data.bookingReference && (
                    <div style={{ fontSize: '14px', color: isDark ? '#94A3B8' : '#64748B', marginBottom: '12px' }}>
                        Reference: <strong style={{ color: "var(--primary)", fontWeight: 700 }}>{data.bookingReference}</strong>
                    </div>
                )}

                <div className={`badge badge-${data.status === 'confirmed' ? 'success' : data.status === 'held' ? 'warning' : 'info'}`}>
                    {data.status.toUpperCase()}
                </div>

                {data.message && (
                    <div style={{
                        marginTop: '12px',
                        padding: '10px',
                        background: isDark ? '#0F172A' : '#0F172A',
                        borderRadius: '6px',
                        fontSize: '12px'
                    }}>
                        {data.message}
                    </div>
                )}

                {data.expiresAt && data.status === 'held' && (
                    <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        background: '#FEF3C7',
                        borderRadius: '8px',
                        border: '1px solid #F59E0B'
                    }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#92400E', marginBottom: '4px' }}>
                            ⏰ Payment Required
                        </div>
                        <div style={{ fontSize: '10px', color: '#78350F' }}>
                            Complete before: <strong>{formatDateTime(data.expiresAt)}</strong>
                        </div>
                    </div>
                )}
            </div>

            {/* Order Info */}
            <div className="card" style={{ marginBottom: '12px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }}>Order Information</h3>
                <div style={{ display: 'grid', gap: '8px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Order ID:</span>
                        <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{data.orderId}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: `1px solid ${isDark ? '#334155' : '#E2E8F0'}` }}>
                        <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Total:</span>
                        <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '16px' }}>
                            {data.totalCurrency} {parseFloat(data.totalAmount).toFixed(2)}
                        </span>
                    </div>
                    {data.createdAt && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                            <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Created:</span>
                            <span>{formatDateTime(data.createdAt)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Passengers */}
            <div className="card" style={{ marginBottom: '12px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>👥</span>
                    <span>Passengers ({data.passengers.length})</span>
                </h3>
                <div style={{ display: 'grid', gap: '8px' }}>
                    {data.passengers.map((passenger, index) => (
                        <div key={passenger.id} style={{
                            padding: '12px',
                            background: isDark ? '#0F172A' : '#0F172A',
                            borderRadius: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>
                                    {passenger.name}
                                </div>
                                <div style={{ fontSize: '11px', color: isDark ? '#94A3B8' : '#64748B' }}>
                                    {passenger.type}
                                </div>
                                {passenger.email && (
                                    <div style={{ fontSize: '10px', color: isDark ? '#94A3B8' : '#64748B', marginTop: '2px' }}>
                                        📧 {passenger.email}
                                    </div>
                                )}
                            </div>
                            <div style={{
                                background: 'var(--primary)',
                                color: 'white',
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',

                                fontWeight: 700,
                                fontSize: '12px'
                            }}>
                                {index + 1}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Flight Itinerary */}
            <div className="card">
                <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>✈️</span>
                    <span>Flight Itinerary</span>
                </h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                    {data.slices.map((slice, index) => (
                        <div key={index} style={{
                            padding: '12px',
                            background: isDark ? '#0F172A' : '#F8FAFC',
                            borderRadius: '8px'
                        }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#3B9FFF', marginBottom: '10px' }}>
                                {index === 0 ? 'Outbound' : 'Return'} Flight
                            </div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr auto 1fr',
                                gap: '12px',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontSize: '16px', fontWeight: 700 }}>
                                        {slice.origin.code}
                                    </div>
                                    {slice.origin.city && (
                                        <div style={{ fontSize: '11px', color: isDark ? '#94A3B8' : '#64748B', marginTop: '2px' }}>
                                            {slice.origin.city}
                                        </div>
                                    )}
                                </div>

                                <div style={{
                                    width: '32px',
                                    height: '2px',
                                    background: 'linear-gradient(90deg, #3B9FFF 0%, #2563EB 100%)'
                                }} />

                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '16px', fontWeight: 700 }}>
                                        {slice.destination.code}
                                    </div>
                                    {slice.destination.city && (
                                        <div style={{ fontSize: '11px', color: isDark ? '#94A3B8' : '#64748B', marginTop: '2px' }}>
                                            {slice.destination.city}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {slice.segments && slice.segments.length > 0 && (
                                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${isDark ? '#334155' : '#E2E8F0'}` }}>
                                    {slice.segments.map((segment, segIndex) => (
                                        <div key={segIndex} style={{ fontSize: '11px', color: isDark ? '#94A3B8' : '#64748B', marginBottom: '4px' }}>
                                            {segment.airline} {segment.flightNumber}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
