'use client';

import { useTheme, useWidgetState, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';

// Disable static generation - this is a dynamic widget
export const dynamic = 'force-dynamic';
import { PizzaCard } from '../../components/PizzaCard';
import { SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';

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
    shops: PizzaShop[];
    filters: any;
    totalShops: number;
}

export default function PizzaListWidget() {
    const theme = useTheme();
    const maxHeight = useMaxHeight();
    const isDark = theme === 'dark';

    const { isReady, getToolOutput, callTool } = useWidgetSDK();

    // Access tool output
    const data = getToolOutput<WidgetData>();

    console.log('🍕 PizzaListWidget render:', { isReady, hasData: !!data, data });

    // Persistent state for view mode and favorites
    const [state, setState] = useWidgetState<{
        viewMode: 'grid' | 'list';
        favorites: string[];
        sortBy: 'rating' | 'name' | 'price';
    }>(() => ({
        viewMode: 'grid',
        favorites: [],
        sortBy: 'rating',
    }));

    const [showFilters, setShowFilters] = useState(false);

    if (!data) {
        return (
            <div style={{
                padding: '40px',
                textAlign: 'center',
                color: isDark ? '#fff' : '#000',
            }}>
                Loading pizza shops... {isReady ? '(SDK ready but no data)' : '(waiting for SDK)'}
            </div>
        );
    }

    // Check if shops array exists
    if (!data.shops || !Array.isArray(data.shops)) {
        console.error('❌ Invalid data structure:', data);
        return (
            <div style={{
                padding: '40px',
                textAlign: 'center',
                color: isDark ? '#fff' : '#000',
            }}>
                Error: Invalid data structure. Expected shops array.
                <pre style={{ marginTop: '16px', fontSize: '12px', textAlign: 'left' }}>
                    {JSON.stringify(data, null, 2)}
                </pre>
            </div>
        );
    }

    const toggleFavorite = (shopId: string) => {
        const favorites = state?.favorites || [];
        const newFavorites = favorites.includes(shopId)
            ? favorites.filter(id => id !== shopId)
            : [...favorites, shopId];

        setState({ ...state, favorites: newFavorites });
    };

    const handleShopClick = async (shopId: string) => {
        // Call the show_pizza_shop tool to show shop details
        await callTool('show_pizza_shop', { shopId });
    };

    // Sort shops
    let sortedShops = [...data.shops];
    switch (state?.sortBy) {
        case 'rating':
            sortedShops.sort((a, b) => b.rating - a.rating);
            break;
        case 'name':
            sortedShops.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'price':
            sortedShops.sort((a, b) => a.priceLevel - b.priceLevel);
            break;
    }

    return (
        <div style={{
            background: isDark ? '#0a0a0a' : '#f9fafb',
            minHeight: '400px',
            maxHeight: maxHeight || '600px',
            overflow: 'auto',
        }}>
            {/* Header */}
            <div style={{
                background: isDark ? '#1a1a1a' : '#ffffff',
                borderBottom: `1px solid ${isDark ? '#333' : '#e5e7eb'}`,
                padding: '12px 16px',
                position: 'sticky',
                top: 0,
                zIndex: 10,
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                        <h1 style={{
                            margin: '0 0 2px 0',
                            fontSize: '18px',
                            fontWeight: '700',
                            color: isDark ? '#fff' : '#111',
                        }}>
                            🍕 Pizza Shops
                        </h1>
                        <p style={{
                            margin: 0,
                            fontSize: '12px',
                            color: isDark ? '#999' : '#666',
                        }}>
                            {data.totalShops} shops found
                        </p>
                    </div>

                    {/* Sort and Filter Controls */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select
                            value={state?.sortBy || 'rating'}
                            onChange={(e) => setState({ ...state, sortBy: e.target.value as any })}
                            style={{
                                padding: '6px 10px',
                                background: isDark ? '#1a1a1a' : '#fff',
                                border: `1px solid ${isDark ? '#444' : '#d1d5db'}`,
                                borderRadius: '6px',
                                color: isDark ? '#fff' : '#111',
                                fontSize: '12px',
                                cursor: 'pointer',
                                outline: 'none',
                            }}
                        >
                            <option value="rating">⭐ Rating</option>
                            <option value="name">🔤 Name</option>
                            <option value="price">💰 Price</option>
                        </select>

                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            style={{
                                padding: '8px 12px',
                                background: showFilters
                                    ? (isDark ? '#333' : '#f3f4f6')
                                    : 'transparent',
                                border: `1px solid ${isDark ? '#444' : '#d1d5db'}`,
                                borderRadius: '8px',
                                cursor: 'pointer',
                                color: isDark ? '#fff' : '#111',
                            }}
                        >
                            <SlidersHorizontal size={18} />
                        </button>
                    </div>
                </div>

                {/* Filters */}
                {showFilters && (
                    <div style={{
                        padding: '16px',
                        background: isDark ? '#111' : '#f9fafb',
                        borderRadius: '8px',
                        marginTop: '12px',
                    }}>
                        <p style={{
                            margin: '0 0 8px 0',
                            fontSize: '12px',
                            color: isDark ? '#999' : '#666',
                        }}>
                            Filters coming soon...
                        </p>
                    </div>
                )}

                {/* Favorites Count */}
                {state?.favorites && state.favorites.length > 0 && (
                    <div style={{
                        marginTop: '12px',
                        padding: '8px 12px',
                        background: isDark ? '#1a1a1a' : '#fef3c7',
                        border: `1px solid ${isDark ? '#333' : '#fbbf24'}`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        color: isDark ? '#fbbf24' : '#92400e',
                    }}>
                        ❤️ {state.favorites.length} favorite{state.favorites.length !== 1 ? 's' : ''}
                    </div>
                )}
            </div>

            {/* Horizontal Scrolling Shop Cards */}
            <div style={{
                padding: '12px 16px',
                overflowX: 'auto',
                overflowY: 'hidden',
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'thin',
            }}>
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    paddingBottom: '4px',
                }}>
                    {sortedShops.map(shop => (
                        <div
                            key={shop.id}
                            style={{
                                minWidth: '280px',
                                maxWidth: '280px',
                                scrollSnapAlign: 'start',
                                flexShrink: 0,
                            }}
                        >
                            <PizzaCard
                                shop={shop}
                                isFavorite={state?.favorites?.includes(shop.id)}
                                onToggleFavorite={toggleFavorite}
                                onSelect={() => handleShopClick(shop.id)}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div style={{
                padding: '20px',
                textAlign: 'center',
                fontSize: '12px',
                color: isDark ? '#666' : '#999',
                borderTop: `1px solid ${isDark ? '#333' : '#e5e7eb'}`,
            }}>
                Powered by NitroStack • Theme: {theme || 'light'} • Scroll horizontally →
            </div>
        </div>
    );
}
