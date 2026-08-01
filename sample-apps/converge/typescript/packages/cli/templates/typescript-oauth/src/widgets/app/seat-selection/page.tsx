'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';
import { useState } from 'react';

/**
 * Seat Selection Widget
 * 
 * Interactive seat map with real-time selection for multiple passengers.
 */

interface Seat {
    id: string;
    column: string;
    available: boolean;
    price?: string;
    type: string;
}

interface Row {
    rowNumber: number;
    seats: Seat[];
}

interface Cabin {
    cabinClass: string;
    rows: Row[];
}

interface SeatMapData {
    offerId: string;
    cabins: Cabin[];
    message?: string;
}

export default function SeatSelection() {
    const { getToolOutput } = useWidgetSDK();
    const theme = useTheme();
    const data = getToolOutput<SeatMapData>();

    const isDark = theme === 'dark';
    const [selectedSeats, setSelectedSeats] = useState<Record<string, string>>({});
    const [activePassenger, setActivePassenger] = useState(0);
    const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);

    const passengers = [
        { id: 'pax_1', name: 'Passenger 1' },
        { id: 'pax_2', name: 'Passenger 2' }
    ];

    const handleSeatClick = (seatId: string, seat: Seat) => {
        if (!seat.available) return;

        const currentPassengerId = passengers[activePassenger].id;
        const seatOwner = Object.entries(selectedSeats).find(([_, id]) => id === seatId)?.[0];

        if (seatOwner && seatOwner !== currentPassengerId) return;

        setSelectedSeats(prev => {
            const newSelections = { ...prev };
            if (newSelections[currentPassengerId] === seatId) {
                delete newSelections[currentPassengerId];
            } else {
                delete newSelections[currentPassengerId];
                newSelections[currentPassengerId] = seatId;
                if (activePassenger < passengers.length - 1) {
                    setTimeout(() => setActivePassenger(activePassenger + 1), 200);
                }
            }
            return newSelections;
        });
    };

    const getSeatStatus = (seatId: string, seat: Seat) => {
        if (!seat.available) return 'unavailable';
        const owner = Object.entries(selectedSeats).find(([_, id]) => id === seatId)?.[0];
        if (owner) {
            const passengerIndex = passengers.findIndex(p => p.id === owner);
            return passengerIndex === activePassenger ? 'selected-active' : 'selected-other';
        }
        return 'available';
    };

    const getSeatColor = (status: string) => {
        if (isDark) {
            return {
                'available': '#334155',
                'selected-active': '#3B9FFF',
                'selected-other': '#22C55E',
                'unavailable': '#1E293B'
            }[status] || '#334155';
        }
        return {
            'available': '#E2E8F0',
            'selected-active': '#3B9FFF',
            'selected-other': '#22C55E',
            'unavailable': '#CBD5E1'
        }[status] || '#E2E8F0';
    };

    const calculateTotalPrice = () => {
        let total = 0;
        Object.values(selectedSeats).forEach(seatId => {
            data?.cabins.forEach(cabin => {
                cabin.rows.forEach(row => {
                    const seat = row.seats.find(s => s.id === seatId);
                    if (seat?.price) total += parseFloat(seat.price);
                });
            });
        });
        return total;
    };

    const getSelectedSeatInfo = (passengerId: string) => {
        const seatId = selectedSeats[passengerId];
        if (!seatId || !data) return null;

        for (const cabin of data.cabins) {
            for (const row of cabin.rows) {
                const seat = row.seats.find(s => s.id === seatId);
                if (seat) return { seat, row: row.rowNumber };
            }
        }
        return null;
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
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div>
                        <h2 style={{
                            margin: 0,
                            fontSize: '18px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span>💺</span>
                            <span>Select Seats</span>
                        </h2>
                        <p style={{
                            margin: '4px 0 0 0',
                            fontSize: '12px',
                            color: isDark ? '#94A3B8' : '#64748B'
                        }}>
                            {data.message || 'Choose seats for all passengers'}
                        </p>
                    </div>

                    {Object.keys(selectedSeats).length > 0 && (
                        <div style={{
                            background: 'var(--primary)',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '10px', opacity: 0.9 }}>Total</div>
                            <div style={{ fontSize: '18px', fontWeight: 700 }}>
                                ${calculateTotalPrice().toFixed(2)}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px' }}>
                {/* Seat Map */}
                <div className="card" style={{ minHeight: '400px' }}>
                    {/* Front Indicator */}
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '20px',
                        paddingBottom: '12px',
                        borderBottom: `2px dashed ${isDark ? '#334155' : '#E2E8F0'}`
                    }}>
                        <div style={{ fontSize: '24px', marginBottom: '6px' }}>✈️</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#3B9FFF' }}>
                            FRONT
                        </div>
                    </div>

                    {data.cabins.map((cabin, cabinIndex) => (
                        <div key={cabinIndex} style={{ marginBottom: '20px' }}>
                            <div style={{
                                background: 'var(--primary)',
                                color: 'white',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                marginBottom: '12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                textTransform: 'uppercase'
                            }}>
                                {cabin.cabinClass.replace('_', ' ')}
                            </div>

                            <div style={{ display: 'grid', gap: '6px' }}>
                                {cabin.rows.map((row) => (
                                    <div key={row.rowNumber} style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'auto 1fr auto',
                                        gap: '12px',
                                        alignItems: 'center'
                                    }}>
                                        <div style={{
                                            width: '32px',
                                            textAlign: 'center',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            color: isDark ? '#94A3B8' : '#64748B'
                                        }}>
                                            {row.rowNumber}
                                        </div>

                                        <div style={{
                                            display: 'flex',
                                            gap: '6px',
                                            justifyContent: 'center',
                                            flexWrap: 'wrap'
                                        }}>
                                            {row.seats.map((seat) => {
                                                const status = getSeatStatus(seat.id, seat);
                                                const isHovered = hoveredSeat === seat.id;

                                                return (
                                                    <div
                                                        key={seat.id}
                                                        onClick={() => handleSeatClick(seat.id, seat)}
                                                        onMouseEnter={() => setHoveredSeat(seat.id)}
                                                        onMouseLeave={() => setHoveredSeat(null)}
                                                        style={{
                                                            width: '40px',
                                                            height: '40px',
                                                            background: getSeatColor(status),
                                                            borderRadius: '6px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            cursor: seat.available ? 'pointer' : 'not-allowed',
                                                            transition: 'all 0.2s ease',
                                                            transform: isHovered && seat.available ? 'scale(1.1)' : 'scale(1)',
                                                            border: status === 'selected-active' ? '2px solid #fff' : 'none',
                                                            position: 'relative',
                                                            opacity: seat.available ? 1 : 0.4
                                                        }}
                                                    >
                                                        <span style={{ fontSize: '16px' }}>💺</span>
                                                        <div style={{
                                                            position: 'absolute',
                                                            bottom: '2px',
                                                            fontSize: '8px',
                                                            fontWeight: 600,
                                                            color: status.includes('selected') ? 'white' : isDark ? '#94A3B8' : '#64748B'
                                                        }}>
                                                            {seat.column}
                                                        </div>
                                                        {seat.price && parseFloat(seat.price) > 0 && isHovered && (
                                                            <div style={{
                                                                position: 'absolute',
                                                                top: '-20px',
                                                                background: '#1a202c',
                                                                color: 'white',
                                                                padding: '3px 6px',
                                                                borderRadius: '4px',
                                                                fontSize: '10px',
                                                                fontWeight: 600,
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                ${seat.price}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div style={{
                                            width: '32px',
                                            textAlign: 'center',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            color: isDark ? '#94A3B8' : '#64748B'
                                        }}>
                                            {row.rowNumber}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Legend */}
                    <div style={{
                        marginTop: '20px',
                        paddingTop: '16px',
                        borderTop: `2px dashed ${isDark ? '#334155' : '#E2E8F0'}`,
                        display: 'flex',
                        gap: '16px',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        fontSize: '11px'
                    }}>
                        {[
                            { label: 'Available', color: isDark ? '#334155' : '#E2E8F0' },
                            { label: 'Your Seat', color: '#3B9FFF' },
                            { label: 'Other', color: '#22C55E' },
                            { label: 'Taken', color: isDark ? '#1E293B' : '#CBD5E1' }
                        ].map(item => (
                            <div key={item.label} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    background: item.color,
                                    borderRadius: '4px'
                                }} />
                                <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                                    {item.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar */}
                <div style={{ display: 'grid', gap: '12px', alignContent: 'start' }}>
                    {/* Passengers */}
                    <div className="card">
                        <h3 style={{
                            margin: '0 0 12px 0',
                            fontSize: '14px',
                            fontWeight: 600
                        }}>
                            Passengers
                        </h3>

                        <div style={{ display: 'grid', gap: '8px' }}>
                            {passengers.map((passenger, index) => {
                                const seatInfo = getSelectedSeatInfo(passenger.id);
                                const isActive = activePassenger === index;

                                return (
                                    <div
                                        key={passenger.id}
                                        onClick={() => setActivePassenger(index)}
                                        className={isActive ? 'nitro-gradient' : ''}
                                        style={{
                                            padding: '12px',
                                            background: isActive ? undefined : (isDark ? '#0F172A' : '#F8FAFC'),
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            border: isActive ? '2px solid #fff' : '2px solid transparent'
                                        }}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div>
                                                <div style={{
                                                    fontWeight: 600,
                                                    fontSize: '13px',
                                                    color: isActive ? 'white' : (isDark ? '#F8FAFC' : '#020617'),
                                                    marginBottom: '2px'
                                                }}>
                                                    {passenger.name}
                                                </div>
                                                {seatInfo ? (
                                                    <div style={{
                                                        fontSize: '11px',
                                                        color: isActive ? 'rgba(255,255,255,0.9)' : (isDark ? '#94A3B8' : '#64748B')
                                                    }}>
                                                        {seatInfo.row}{seatInfo.seat.column}
                                                        {seatInfo.seat.price && ` • $${seatInfo.seat.price}`}
                                                    </div>
                                                ) : (
                                                    <div style={{
                                                        fontSize: '11px',
                                                        color: isActive ? 'rgba(255,255,255,0.8)' : (isDark ? '#64748B' : '#94A3B8')
                                                    }}>
                                                        No seat
                                                    </div>
                                                )}
                                            </div>

                                            {seatInfo && (
                                                <div style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    background: isActive ? 'rgba(255,255,255,0.2)' : '#22C55E',
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontSize: '12px'
                                                }}>
                                                    ✓
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="card">
                        <h3 style={{
                            margin: '0 0 12px 0',
                            fontSize: '14px',
                            fontWeight: 600
                        }}>
                            Summary
                        </h3>

                        <div style={{ display: 'grid', gap: '10px', marginBottom: '12px' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '12px'
                            }}>
                                <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Selected:</span>
                                <span style={{ fontWeight: 600 }}>
                                    {Object.keys(selectedSeats).length} / {passengers.length}
                                </span>
                            </div>

                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '12px',
                                paddingTop: '10px',
                                borderTop: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`
                            }}>
                                <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Total:</span>
                                <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '16px' }}>
                                    ${calculateTotalPrice().toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <button
                            disabled={Object.keys(selectedSeats).length !== passengers.length}
                            className={Object.keys(selectedSeats).length === passengers.length ? 'btn-primary' : 'btn-secondary'}
                            style={{
                                width: '100%',
                                opacity: Object.keys(selectedSeats).length === passengers.length ? 1 : 0.5,
                                cursor: Object.keys(selectedSeats).length === passengers.length ? 'pointer' : 'not-allowed'
                            }}
                        >
                            {Object.keys(selectedSeats).length === passengers.length
                                ? 'Confirm Selection'
                                : `Select ${passengers.length - Object.keys(selectedSeats).length} More`
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
