'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

/**
 * Payment Confirmation Widget - Success state with booking details
 */

interface PaymentData {
    orderId: string;
    status: string;
    totalAmount: string;
    totalCurrency: string;
    bookingReference?: string;
    message?: string;
}

export default function PaymentConfirmation() {
    const { getToolOutput } = useWidgetSDK();
    const theme = useTheme();
    const data = getToolOutput<PaymentData>();

    const isDark = theme === 'dark';

    if (!data) {
        return <div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>;
    }

    const isConfirmed = data.status === 'confirmed';

    return (
        <div className={isDark ? 'dark' : ''} style={{
            padding: '24px',
            background: isDark ? '#020617' : '#FFFFFF',
            color: isDark ? '#F8FAFC' : '#020617',
            minHeight: '300px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
                {/* Success Icon */}
                <div style={{
                    width: '100px',
                    height: '100px',
                    margin: '0 auto 24px',
                    background: isConfirmed ? 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' : 'linear-gradient(135deg, #3B9FFF 0%, #2563EB 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isConfirmed ? '0 8px 24px rgba(34, 197, 94, 0.3)' : '0 8px 24px rgba(59, 159, 255, 0.3)'
                }}>
                    <div style={{ fontSize: '48px', color: 'white' }}>
                        {isConfirmed ? '✓' : '💳'}
                    </div>
                </div>

                {/* Title */}
                <h2 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: 700 }}>
                    {isConfirmed ? 'Payment Successful!' : 'Complete Payment'}
                </h2>

                <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: isDark ? '#94A3B8' : '#64748B', lineHeight: '1.6' }}>
                    {data.message || (isConfirmed ? 'Your booking has been confirmed.' : 'Review and confirm your payment.')}
                </p>

                {/* Booking Details */}
                <div style={{
                    background: isDark ? '#0F172A' : '#F8FAFC',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '24px',
                    border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`
                }}>
                    {data.bookingReference && (
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '11px', color: isDark ? '#94A3B8' : '#64748B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Booking Reference
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: '#22C55E', letterSpacing: '1px', fontFamily: 'monospace' }}>
                                {data.bookingReference}
                            </div>
                        </div>
                    )}

                    <div style={{
                        display: 'grid',
                        gap: '12px',
                        paddingTop: data.bookingReference ? '16px' : '0',
                        borderTop: data.bookingReference ? `1px solid ${isDark ? '#334155' : '#E2E8F0'}` : 'none'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                            <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Order ID:</span>
                            <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{data.orderId}</span>
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            paddingTop: '12px',
                            borderTop: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`
                        }}>
                            <span style={{ fontSize: '14px', fontWeight: 600 }}>
                                {isConfirmed ? 'Amount Paid:' : 'Total Amount:'}
                            </span>
                            <span style={{ color: 'var(--primary)', fontSize: '20px', fontWeight: 700 }}>
                                {data.totalCurrency} {parseFloat(data.totalAmount).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                {isConfirmed ? (
                    <div style={{ display: 'grid', gap: '10px' }}>
                        <button className="btn-primary" style={{ width: '100%' }}>
                            📧 Email Confirmation
                        </button>
                        <button className="btn-secondary" style={{ width: '100%' }}>
                            📄 Download Receipt
                        </button>
                    </div>
                ) : (
                    <div>
                        <button className="btn-primary" style={{ width: '100%', marginBottom: '12px' }}>
                            🔒 Confirm & Pay {data.totalCurrency} {parseFloat(data.totalAmount).toFixed(2)}
                        </button>
                        <div style={{ fontSize: '11px', color: isDark ? '#94A3B8' : '#64748B', lineHeight: '1.5' }}>
                            🔒 Your payment is secure and encrypted
                        </div>
                    </div>
                )}

                {/* Footer Note */}
                {isConfirmed && (
                    <div style={{
                        marginTop: '24px',
                        padding: '12px',
                        background: '#FEF3C7',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: '#92400E',
                        lineHeight: '1.5'
                    }}>
                        <strong>📱 Important:</strong> A confirmation email has been sent to your registered email address.
                    </div>
                )}
            </div>
        </div>
    );
}
