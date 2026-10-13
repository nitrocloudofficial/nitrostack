'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

/**
 * Flight Search Results Widget
 * 
 * Modern, compact display of flight search results with Nitrocloud branding.
 */

interface FlightSegment {
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    stops: number;
    airline: string;
    flightNumber: string;
}

interface FlightOffer {
    id: string;
    totalAmount: string;
    totalCurrency: string;
    outbound: FlightSegment;
    return?: FlightSegment;
    fareType: string;
    refundable: boolean;
    changeable: boolean;
}

interface FlightSearchData {
    searchParams: {
        origin: string;
        destination: string;
        departureDate: string;
        returnDate?: string;
        passengers: {
            adults: number;
            children: number;
            infants: number;
        };
        cabinClass: string;
    };
    totalOffers: number;
    offers: FlightOffer[];
}

export default function FlightSearchResults() {
    const { getToolOutput, callTool } = useWidgetSDK();
    const theme = useTheme();
    const data = getToolOutput<FlightSearchData>();
    const isDark = theme === 'dark';

    const handleFlightClick = async (offerId: string) => {
        try {
            await callTool('get_flight_details', { offerId });
        } catch (error) {
            console.error('Failed to get flight details:', error);
        }
    };

    const formatDuration = (duration: string) => {
        const match = duration.match(/PT(\d+H)?(\d+M)?/);
        if (!match) return duration;
        const hours = match[1] ? parseInt(match[1]) : 0;
        const minutes = match[2] ? parseInt(match[2]) : 0;
        return `${hours}h ${minutes}m`;
    };

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    const getAirlineInitials = (name: string) => {
        return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    };

    if (!data?.searchParams) {
        return (
            <div style={{
                padding: '24px',
                textAlign: 'center',
                color: isDark ? '#F8FAFC' : '#020617'
            }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
                <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                    Invalid Data
                </div>
                <div style={{ fontSize: '14px', color: isDark ? '#94A3B8' : '#64748B' }}>
                    Flight search data is missing
                </div>
            </div>
        );
    }

    const totalPassengers = (data.searchParams.passengers?.adults || 0) +
        (data.searchParams.passengers?.children || 0) +
        (data.searchParams.passengers?.infants || 0);

    const FlightSegment = ({ segment, label }: { segment: FlightSegment; label: string }) => (
        <div style={{
            background: isDark ? '#0F172A' : '#F8FAFC',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '8px'
        }}>
            <div style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#3B9FFF',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
            }}>
                <span>{label === 'Outbound' ? '✈️' : '🔄'}</span>
                <span>{label}</span>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                gap: '12px',
                alignItems: 'center'
            }}>
                <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: isDark ? '#F8FAFC' : '#020617' }}>
                        {formatTime(segment.departureTime)}
                    </div>
                    <div style={{ fontSize: '12px', color: isDark ? '#94A3B8' : '#64748B', marginTop: '2px' }}>
                        {segment.origin}
                    </div>
                </div>

                <div style={{
                    textAlign: 'center',
                    padding: '8px',
                    background: isDark ? '#1E293B' : 'white',
                    borderRadius: '6px',
                    minWidth: '100px'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: isDark ? '#F8FAFC' : '#020617' }}>
                        {formatDuration(segment.duration)}
                    </div>
                    <div style={{
                        height: '2px',
                        background: 'linear-gradient(90deg, #3B9FFF 0%, #2563EB 100%)',
                        margin: '6px 0',
                        position: 'relative'
                    }}>
                        {segment.stops > 0 && (
                            <div style={{
                                width: '6px',
                                height: '6px',
                                background: '#3B9FFF',
                                borderRadius: '50%',
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)'
                            }} />
                        )}
                    </div>
                    <div style={{ fontSize: '10px', color: isDark ? '#94A3B8' : '#64748B' }}>
                        {segment.stops === 0 ? 'Direct' : `${segment.stops} stop${segment.stops > 1 ? 's' : ''}`}
                    </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: isDark ? '#F8FAFC' : '#020617' }}>
                        {formatTime(segment.arrivalTime)}
                    </div>
                    <div style={{ fontSize: '12px', color: isDark ? '#94A3B8' : '#64748B', marginTop: '2px' }}>
                        {segment.destination}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className={isDark ? 'dark' : ''} style={{
            padding: '16px',
            background: isDark ? '#020617' : '#FFFFFF',
            color: isDark ? '#F8FAFC' : '#020617'
        }}>
            {/* Header */}
            <div style={{
                background: isDark ? '#0F172A' : '#F8FAFC',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
                border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '12px'
                }}>
                    <div style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span>{data.searchParams.origin}</span>
                        <span style={{ color: '#3B9FFF' }}>✈️</span>
                        <span>{data.searchParams.destination}</span>
                    </div>

                    <div className="badge badge-info">
                        {data.totalOffers} flights
                    </div>
                </div>

                <div style={{
                    display: 'flex',
                    gap: '16px',
                    flexWrap: 'wrap',
                    fontSize: '12px',
                    color: isDark ? '#94A3B8' : '#64748B'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📅</span>
                        <span>
                            {formatDate(data.searchParams.departureDate)}
                            {data.searchParams.returnDate && ` - ${formatDate(data.searchParams.returnDate)}`}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>👥</span>
                        <span>{totalPassengers} pax</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>💺</span>
                        <span>{(data.searchParams.cabinClass || 'economy').replace('_', ' ')}</span>
                    </div>
                </div>
            </div>

            {/* Flight Offers */}
            {data.offers.length > 0 ? (
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    overflowX: 'auto',
                    paddingBottom: '12px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: isDark ? '#334155 #0F172A' : '#CBD5E1 #F1F5F9'
                }}>
                    {data.offers.map((offer) => (
                        <div key={offer.id} style={{
                            minWidth: '320px',
                            maxWidth: '320px',
                            background: isDark ? '#1a1a1a' : '#ffffff',
                            border: `1px solid ${isDark ? '#333' : '#e5e7eb'}`,
                            borderRadius: '12px',
                            padding: '16px',
                            boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer'
                        }}
                            onClick={() => handleFlightClick(offer.id)}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = isDark
                                    ? '0 4px 12px rgba(59, 159, 255, 0.2)'
                                    : '0 4px 12px rgba(59, 159, 255, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = isDark
                                    ? '0 2px 8px rgba(0,0,0,0.3)'
                                    : '0 2px 8px rgba(0,0,0,0.1)';
                            }}>
                            {/* Offer Header */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '12px',
                                paddingBottom: '12px',
                                borderBottom: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        background: 'linear-gradient(135deg, #3B9FFF 0%, #2563EB 100%)',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontWeight: 700,
                                        fontSize: '14px'
                                    }}>
                                        {getAirlineInitials(offer.outbound.airline)}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 600 }}>
                                            {offer.outbound.airline}
                                        </div>
                                        <div style={{ fontSize: '11px', color: isDark ? '#94A3B8' : '#64748B' }}>
                                            {offer.outbound.flightNumber}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                    <div style={{
                                        color: 'var(--primary)',
                                        fontSize: '24px',
                                        fontWeight: 700
                                    }}>
                                        {offer.totalCurrency} {parseFloat(offer.totalAmount).toFixed(0)}
                                    </div>
                                    <div style={{ fontSize: '10px', color: isDark ? '#94A3B8' : '#64748B' }}>
                                        Total
                                    </div>
                                </div>
                            </div>

                            {/* Flight Segments */}
                            <FlightSegment segment={offer.outbound} label="Outbound" />
                            {offer.return && <FlightSegment segment={offer.return} label="Return" />}

                            {/* Badges */}
                            <div style={{
                                display: 'flex',
                                gap: '6px',
                                flexWrap: 'wrap',
                                marginTop: '12px'
                            }}>
                                <span className={offer.refundable ? 'badge badge-success' : 'badge badge-warning'}>
                                    {offer.refundable ? '✓ Refundable' : '✗ Non-refundable'}
                                </span>
                                {offer.changeable && (
                                    <span className="badge badge-success">✓ Changeable</span>
                                )}
                                <span className="badge badge-info">{offer.fareType}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{
                    background: isDark ? '#0F172A' : '#F8FAFC',
                    borderRadius: '12px',
                    padding: '32px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>✈️</div>
                    <div style={{ fontSize: '14px', color: isDark ? '#94A3B8' : '#64748B' }}>
                        No flights found. Try adjusting your search.
                    </div>
                </div>
            )}
        </div>
    );
}
