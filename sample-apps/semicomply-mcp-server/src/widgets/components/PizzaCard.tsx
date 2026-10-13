'use client';

import { useTheme, useWidgetState, useMaxHeight, useDisplayMode } from '@nitrostack/widgets';
import { Star, MapPin, Phone, Globe, Clock } from 'lucide-react';

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

interface PizzaCardProps {
    shop: PizzaShop;
    onSelect?: (shop: PizzaShop) => void;
    isFavorite?: boolean;
    onToggleFavorite?: (shopId: string) => void;
}

export function PizzaCard({ shop, onSelect, isFavorite, onToggleFavorite }: PizzaCardProps) {
    const theme = useTheme();
    const isDark = theme === 'dark';

    const priceSymbol = '$'.repeat(shop.priceLevel);

    return (
        <div
            onClick={() => onSelect?.(shop)}
            style={{
                background: isDark ? '#1a1a1a' : '#ffffff',
                border: `1px solid ${isDark ? '#333' : '#e5e7eb'}`,
                borderRadius: '12px',
                overflow: 'hidden',
                cursor: onSelect ? 'pointer' : 'default',
                transition: 'all 0.2s',
                boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
            }}
            onMouseEnter={(e) => {
                if (onSelect) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = isDark
                        ? '0 4px 12px rgba(0,0,0,0.4)'
                        : '0 4px 12px rgba(0,0,0,0.15)';
                }
            }}
            onMouseLeave={(e) => {
                if (onSelect) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = isDark
                        ? '0 2px 8px rgba(0,0,0,0.3)'
                        : '0 2px 8px rgba(0,0,0,0.1)';
                }
            }}
        >
            {/* Image */}
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
                {shop.openNow && (
                    <div style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        background: '#10b981',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                    }}>
                        Open Now
                    </div>
                )}
                {onToggleFavorite && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(shop.id);
                        }}
                        style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: 'rgba(255,255,255,0.9)',
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
                        <span style={{ fontSize: '18px' }}>{isFavorite ? '❤️' : '🤍'}</span>
                    </button>
                )}
            </div>

            {/* Content */}
            <div style={{ padding: '16px' }}>
                <h3 style={{
                    margin: '0 0 8px 0',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: isDark ? '#fff' : '#111',
                }}>
                    {shop.name}
                </h3>

                {/* Rating & Price */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Star size={16} fill="#fbbf24" stroke="#fbbf24" />
                        <span style={{ fontSize: '14px', fontWeight: '600', color: isDark ? '#fff' : '#111' }}>
                            {shop.rating}
                        </span>
                        <span style={{ fontSize: '14px', color: isDark ? '#999' : '#666' }}>
                            ({shop.reviews})
                        </span>
                    </div>
                    <span style={{ fontSize: '14px', color: isDark ? '#999' : '#666' }}>
                        {priceSymbol}
                    </span>
                </div>

                {/* Description */}
                <p style={{
                    margin: '0 0 12px 0',
                    fontSize: '14px',
                    color: isDark ? '#ccc' : '#666',
                    lineHeight: '1.4',
                }}>
                    {shop.description}
                </p>

                {/* Cuisine Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                    {shop.cuisine.slice(0, 3).map(c => (
                        <span
                            key={c}
                            style={{
                                background: isDark ? '#333' : '#f3f4f6',
                                color: isDark ? '#ccc' : '#666',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '12px',
                            }}
                        >
                            {c}
                        </span>
                    ))}
                </div>

                {/* Address */}
                <div style={{ display: 'flex', alignItems: 'start', gap: '8px', marginBottom: '8px' }}>
                    <MapPin size={16} style={{ color: isDark ? '#999' : '#666', marginTop: '2px', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: isDark ? '#ccc' : '#666' }}>
                        {shop.address}
                    </span>
                </div>

                {/* Hours */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} style={{ color: isDark ? '#999' : '#666' }} />
                    <span style={{ fontSize: '13px', color: isDark ? '#ccc' : '#666' }}>
                        {shop.hours.open} - {shop.hours.close}
                    </span>
                </div>
            </div>
        </div>
    );
}
