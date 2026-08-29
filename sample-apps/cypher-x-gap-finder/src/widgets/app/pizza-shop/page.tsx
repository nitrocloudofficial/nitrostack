'use client';

import { useTheme, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';

// Disable static generation - this is a dynamic widget
export const dynamic = 'force-dynamic';
import { Star, MapPin, Phone, Globe, Clock, Heart, Share2, Navigation } from 'lucide-react';

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

interface WidgetData {
    shop: PizzaShop;
    relatedShops: PizzaShop[];
}

export default function PizzaShopWidget() {
    const theme = useTheme();
    const maxHeight = useMaxHeight();
    const isDark = theme === 'dark';
    const { isReady, getToolOutput, openExternal } = useWidgetSDK();

    // Access tool output
    const data = getToolOutput<WidgetData>();

    if (!data) {
        return (
            <div style={{
                padding: '40px',
                textAlign: 'center',
                color: isDark ? '#fff' : '#000',
            }}>
                Loading shop details... {isReady ? '(SDK ready but no data)' : '(waiting for SDK)'}
            </div>
        );
    }

    const { shop, relatedShops } = data;
    const priceSymbol = '$'.repeat(shop.priceLevel);

    const openMaps = () => {
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.address)}`;
        openExternal(url);
    };

    const callPhone = () => {
        openExternal(`tel:${shop.phone}`);
    };

    const visitWebsite = () => {
        if (shop.website) {
            openExternal(shop.website);
        }
    };

    return (
        <div style={{
            background: isDark ? '#0a0a0a' : '#f9fafb',
            minHeight: '500px',
            maxHeight: maxHeight || '800px',
            overflow: 'auto',
        }}>
            {/* Hero Image */}
            <div style={{ position: 'relative', height: '300px', overflow: 'hidden' }}>
                <img
                    src={shop.image}
                    alt={shop.name}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                    }}
                />
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                }} />

                {/* Shop Name Overlay */}
                <div style={{
                    position: 'absolute',
                    bottom: '24px',
                    left: '24px',
                    right: '24px',
                }}>
                    <h1 style={{
                        margin: '0 0 8px 0',
                        fontSize: '32px',
                        fontWeight: '700',
                        color: '#fff',
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    }}>
                        {shop.name}
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Star size={20} fill="#fbbf24" stroke="#fbbf24" />
                            <span style={{ fontSize: '18px', fontWeight: '600', color: '#fff' }}>
                                {shop.rating}
                            </span>
                            <span style={{ fontSize: '14px', color: '#ccc' }}>
                                ({shop.reviews} reviews)
                            </span>
                        </div>
                        <span style={{ fontSize: '16px', color: '#fff' }}>{priceSymbol}</span>
                        {shop.openNow && (
                            <span style={{
                                background: '#10b981',
                                color: 'white',
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '14px',
                                fontWeight: '600',
                            }}>
                                Open Now
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
                {/* Description */}
                <p style={{
                    margin: '0 0 24px 0',
                    fontSize: '16px',
                    lineHeight: '1.6',
                    color: isDark ? '#ccc' : '#666',
                }}>
                    {shop.description}
                </p>

                {/* Cuisine Tags */}
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{
                        margin: '0 0 12px 0',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: isDark ? '#999' : '#666',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                    }}>
                        Cuisine
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {shop.cuisine.map(c => (
                            <span
                                key={c}
                                style={{
                                    background: isDark ? '#1a1a1a' : '#f3f4f6',
                                    color: isDark ? '#fff' : '#111',
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    border: `1px solid ${isDark ? '#333' : '#e5e7eb'}`,
                                }}
                            >
                                {c}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Specialties */}
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{
                        margin: '0 0 12px 0',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: isDark ? '#999' : '#666',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                    }}>
                        Specialties
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {shop.specialties.map(s => (
                            <span
                                key={s}
                                style={{
                                    background: isDark ? '#1a1a1a' : '#fef3c7',
                                    color: isDark ? '#fbbf24' : '#92400e',
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    border: `1px solid ${isDark ? '#333' : '#fbbf24'}`,
                                }}
                            >
                                🍕 {s}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Contact Info */}
                <div style={{
                    background: isDark ? '#1a1a1a' : '#fff',
                    border: `1px solid ${isDark ? '#333' : '#e5e7eb'}`,
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '24px',
                }}>
                    <h3 style={{
                        margin: '0 0 16px 0',
                        fontSize: '18px',
                        fontWeight: '600',
                        color: isDark ? '#fff' : '#111',
                    }}>
                        Contact & Hours
                    </h3>

                    {/* Address */}
                    <div style={{ display: 'flex', alignItems: 'start', gap: '12px', marginBottom: '12px' }}>
                        <MapPin size={20} style={{ color: isDark ? '#999' : '#666', marginTop: '2px', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: isDark ? '#ccc' : '#666' }}>
                                {shop.address}
                            </p>
                            <button
                                onClick={openMaps}
                                style={{
                                    padding: '6px 12px',
                                    background: isDark ? '#333' : '#f3f4f6',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    color: isDark ? '#fff' : '#111',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <Navigation size={14} />
                                Get Directions
                            </button>
                        </div>
                    </div>

                    {/* Phone */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <Phone size={20} style={{ color: isDark ? '#999' : '#666' }} />
                        <button
                            onClick={callPhone}
                            style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '14px',
                                color: isDark ? '#60a5fa' : '#2563eb',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                            }}
                        >
                            {shop.phone}
                        </button>
                    </div>

                    {/* Website */}
                    {shop.website && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <Globe size={20} style={{ color: isDark ? '#999' : '#666' }} />
                            <button
                                onClick={visitWebsite}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '14px',
                                    color: isDark ? '#60a5fa' : '#2563eb',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                }}
                            >
                                Visit Website
                            </button>
                        </div>
                    )}

                    {/* Hours */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Clock size={20} style={{ color: isDark ? '#999' : '#666' }} />
                        <span style={{ fontSize: '14px', color: isDark ? '#ccc' : '#666' }}>
                            {shop.hours.open} - {shop.hours.close}
                        </span>
                    </div>
                </div>

                {/* Related Shops */}
                {relatedShops.length > 0 && (
                    <div>
                        <h3 style={{
                            margin: '0 0 16px 0',
                            fontSize: '18px',
                            fontWeight: '600',
                            color: isDark ? '#fff' : '#111',
                        }}>
                            You Might Also Like
                        </h3>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {relatedShops.map(related => (
                                <div
                                    key={related.id}
                                    style={{
                                        background: isDark ? '#1a1a1a' : '#fff',
                                        border: `1px solid ${isDark ? '#333' : '#e5e7eb'}`,
                                        borderRadius: '12px',
                                        padding: '16px',
                                        display: 'flex',
                                        gap: '16px',
                                    }}
                                >
                                    <img
                                        src={related.image}
                                        alt={related.name}
                                        style={{
                                            width: '80px',
                                            height: '80px',
                                            borderRadius: '8px',
                                            objectFit: 'cover',
                                        }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{
                                            margin: '0 0 4px 0',
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            color: isDark ? '#fff' : '#111',
                                        }}>
                                            {related.name}
                                        </h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <Star size={14} fill="#fbbf24" stroke="#fbbf24" />
                                            <span style={{ fontSize: '14px', color: isDark ? '#ccc' : '#666' }}>
                                                {related.rating}
                                            </span>
                                        </div>
                                        <p style={{
                                            margin: 0,
                                            fontSize: '13px',
                                            color: isDark ? '#999' : '#666',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {related.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
