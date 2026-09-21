'use client';

import { useTheme } from '@nitrostack/widgets';
import { Star, MapPin, Phone, Globe, ShieldAlert, Cpu } from 'lucide-react';

interface AegisNode {
    id: string;
    name: string;
    description: string;
    address: string;
    coords: [number, number];
    rating: number;
    reviews: number;
    priceLevel: 1 | 2 | 3; // Threat Level: 1 = Low, 2 = Medium, 3 = High
    cuisine: string[];
    hours: { open: string; close: string };
    phone: string;
    website?: string;
    image: string;
    specialties: string[];
    openNow: boolean;
}

interface CapabilityCardProps {
    shop: AegisNode; // Keep property name 'shop' to preserve event contract
    onSelect?: (node: AegisNode) => void;
    isFavorite?: boolean;
    onToggleFavorite?: (nodeId: string) => void;
}

export function CapabilityCard({ shop, onSelect, isFavorite, onToggleFavorite }: CapabilityCardProps) {
    const theme = useTheme();
    const isDark = theme === 'dark';

    // Threat Level details
    const threatConfig = {
        1: { label: 'Low Threat', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
        2: { label: 'Medium Threat', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
        3: { label: 'High Threat', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
    }[shop.priceLevel] || { label: 'Unknown', color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.1)' };

    return (
        <div
            onClick={() => onSelect?.(shop)}
            style={{
                background: isDark ? '#111827' : '#ffffff',
                border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                borderRadius: '16px',
                overflow: 'hidden',
                cursor: onSelect ? 'pointer' : 'default',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
            }}
            onMouseEnter={(e) => {
                if (onSelect) {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = isDark
                        ? '0 12px 30px rgba(0,0,0,0.6)'
                        : '0 12px 30px rgba(0,0,0,0.1)';
                }
            }}
            onMouseLeave={(e) => {
                if (onSelect) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = isDark
                        ? '0 4px 20px rgba(0,0,0,0.4)'
                        : '0 4px 20px rgba(0,0,0,0.05)';
                }
            }}
        >
            {/* Image Header wrapper */}
            <div style={{ position: 'relative', height: '160px', overflow: 'hidden' }}>
                <img
                    src={shop.image}
                    alt={shop.name}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                    }}
                />
                
                {/* Threat Badge */}
                <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    backgroundColor: threatConfig.bg,
                    border: `1px solid ${threatConfig.color}`,
                    backdropFilter: 'blur(8px)',
                    color: threatConfig.color,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                }}>
                    <ShieldAlert size={12} />
                    {threatConfig.label}
                </div>

                {/* Connection Status Badge (Right) */}
                <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '48px',
                    backgroundColor: shop.openNow ? 'rgba(16, 185, 129, 0.9)' : 'rgba(107, 114, 128, 0.9)',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '600',
                }}>
                    {shop.openNow ? 'Connected' : 'Offline'}
                </div>

                {/* Favorite Bookmark Button */}
                {onToggleFavorite && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(shop.id);
                        }}
                        style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            background: 'rgba(255, 255, 255, 0.9)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <span style={{ fontSize: '18px' }}>{isFavorite ? '⭐️' : '☆'}</span>
                    </button>
                )}
            </div>

            {/* Content body */}
            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{
                    margin: '0 0 6px 0',
                    fontSize: '18px',
                    fontWeight: '700',
                    color: isDark ? '#fff' : '#111827',
                }}>
                    {shop.name}
                </h3>

                {/* Safety Score/Audit Stars */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Star size={16} fill="#fbbf24" stroke="#fbbf24" />
                        <span style={{ fontSize: '14px', fontWeight: '600', color: isDark ? '#f3f4f6' : '#1f2937' }}>
                            {shop.rating}
                        </span>
                        <span style={{ fontSize: '13px', color: isDark ? '#9ca3af' : '#6b7280' }}>
                            ({shop.reviews} audits)
                        </span>
                    </div>
                </div>

                {/* Description */}
                <p style={{
                    margin: '0 0 16px 0',
                    fontSize: '14px',
                    color: isDark ? '#d1d5db' : '#4b5563',
                    lineHeight: '1.5',
                    flex: 1,
                }}>
                    {shop.description}
                </p>

                {/* Capability Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                    {shop.cuisine.slice(0, 3).map(c => (
                        <span
                            key={c}
                            style={{
                                background: isDark ? '#1f2937' : '#f3f4f6',
                                color: isDark ? '#e5e7eb' : '#374151',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '500',
                            }}
                        >
                            {c}
                        </span>
                    ))}
                </div>

                {/* Interface bindings */}
                <div style={{
                    borderTop: `1px solid ${isDark ? '#374151' : '#f3f4f6'}`,
                    paddingTop: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Cpu size={14} style={{ color: isDark ? '#9ca3af' : '#6b7280', flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', color: isDark ? '#d1d5db' : '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {shop.address}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
