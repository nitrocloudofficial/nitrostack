'use client';

interface AegisNode {
    id: string;
    name: string;
    description: string;
    address: string;
    coords: [number, number];
    rating: number;
    reviews: number;
    priceLevel: 1 | 2 | 3;
    cuisine: string[];
    hours: { open: string; close: string };
    phone: string;
    website?: string;
    image: string;
    specialties: string[];
    openNow: boolean;
}

interface CompactCapabilityCardProps {
    shop: AegisNode; // Keep property name 'shop' to preserve event contract
    isSelected: boolean;
    onClick: () => void;
    isDark?: boolean;
}

export function CompactCapabilityCard({ shop, isSelected, onClick, isDark = true }: CompactCapabilityCardProps) {
    const threatLabel = { 1: 'Low Threat', 2: 'Med Threat', 3: 'High Threat' }[shop.priceLevel] || 'Risk';
    const threatColor = { 1: '#10b981', 2: '#f59e0b', 3: '#ef4444' }[shop.priceLevel] || '#9ca3af';

    return (
        <div
            onClick={onClick}
            style={{
                display: 'flex',
                gap: '12px',
                padding: '12px',
                background: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: isSelected ? '2px solid #3b82f6' : `2px solid ${isDark ? '#4b5563' : 'transparent'}`,
                boxShadow: isSelected
                    ? '0 4px 16px rgba(59, 130, 246, 0.4)'
                    : '0 2px 8px rgba(0, 0, 0, 0.2)',
                minWidth: '280px',
                maxWidth: '280px',
            }}
            onMouseEnter={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.25)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
                }
            }}
        >
            {/* Image */}
            <img
                src={shop.image}
                alt={shop.name}
                style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '8px',
                    objectFit: 'cover',
                    flexShrink: 0,
                }}
            />

            {/* Info */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minWidth: 0,
            }}>
                {/* Name */}
                <h4 style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: '700',
                    color: isDark ? '#fff' : '#111',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}>
                    {shop.name}
                </h4>

                {/* Description */}
                <p style={{
                    margin: '2px 0 4px 0',
                    fontSize: '12px',
                    color: isDark ? '#d1d5db' : '#555',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}>
                    {shop.description}
                </p>

                {/* Safety Score & Threat Level */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <span style={{ color: '#fbbf24' }}>⭐</span>
                        <span style={{ fontWeight: '600', color: isDark ? '#fff' : '#111' }}>{shop.rating}</span>
                    </div>
                    <span style={{ color: isDark ? '#4b5563' : '#ccc' }}>•</span>
                    <span style={{
                        color: threatColor,
                        fontWeight: '700',
                    }}>
                        {threatLabel}
                    </span>
                    {shop.openNow ? (
                        <>
                            <span style={{ color: isDark ? '#4b5563' : '#ccc' }}>•</span>
                            <span style={{
                                color: '#10b981',
                                fontWeight: '600',
                            }}>
                                Connected
                            </span>
                        </>
                    ) : (
                        <>
                            <span style={{ color: isDark ? '#4b5563' : '#ccc' }}>•</span>
                            <span style={{
                                color: '#ef4444',
                                fontWeight: '600',
                            }}>
                                Offline
                            </span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
