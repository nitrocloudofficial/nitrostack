'use client';

interface PizzaShop {
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

interface CompactShopCardProps {
    shop: PizzaShop;
    isSelected: boolean;
    onClick: () => void;
    isDark?: boolean;
}

export function CompactShopCard({ shop, isSelected, onClick, isDark = true }: CompactShopCardProps) {
    const priceSymbol = '$'.repeat(shop.priceLevel);

    return (
        <div
            onClick={onClick}
            style={{
                display: 'flex',
                gap: '12px',
                padding: '12px',
                background: isSelected
                    ? 'rgba(255, 255, 255, 0.95)'
                    : 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
                boxShadow: isSelected
                    ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                    : '0 2px 8px rgba(0, 0, 0, 0.1)',
                minWidth: '280px',
                maxWidth: '280px',
            }}
            onMouseEnter={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }
            }}
        >
            {/* Image */}
            <img
                src={shop.image}
                alt={shop.name}
                style={{
                    width: '80px',
                    height: '80px',
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
                    fontWeight: '600',
                    color: '#111',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}>
                    {shop.name}
                </h4>

                {/* Description */}
                <p style={{
                    margin: '4px 0',
                    fontSize: '12px',
                    color: '#666',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}>
                    {shop.description}
                </p>

                {/* Rating & Price */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}>
                        <span style={{ color: '#fbbf24' }}>⭐</span>
                        <span style={{ fontWeight: '600', color: '#111' }}>{shop.rating}</span>
                    </div>
                    <span style={{ color: '#999' }}>•</span>
                    <span style={{ color: '#666' }}>{priceSymbol}</span>
                    {shop.openNow && (
                        <>
                            <span style={{ color: '#999' }}>•</span>
                            <span style={{
                                color: '#10b981',
                                fontWeight: '600',
                                fontSize: '11px',
                            }}>
                                Open Now
                            </span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
