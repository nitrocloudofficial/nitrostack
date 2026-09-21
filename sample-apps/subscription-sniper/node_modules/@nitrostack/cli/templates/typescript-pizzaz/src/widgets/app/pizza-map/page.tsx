'use client';

import { useTheme, useWidgetState, useMaxHeight, useDisplayMode, useWidgetSDK } from '@nitrostack/widgets';

// Disable static generation - this is a dynamic widget
export const dynamic = 'force-dynamic';
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { CompactShopCard } from '../../components/CompactShopCard';
import { Maximize2 } from 'lucide-react';

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
    filter: string;
    totalShops: number;
}

export default function PizzaMapWidget() {
    const theme = useTheme();
    const maxHeight = useMaxHeight();
    const displayMode = useDisplayMode();
    const isDark = theme === 'dark';
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [selectedShop, setSelectedShop] = useState<PizzaShop | null>(null);

    const { isReady, getToolOutput, callTool, requestFullscreen } = useWidgetSDK();

    // Access tool output
    const data = getToolOutput<WidgetData>();

    // Persistent state
    const [state, setState] = useWidgetState<{
        favorites: string[];
    }>(() => ({
        favorites: [],
    }));

    useEffect(() => {
        if (!mapContainer.current || !data || map.current) return;

        // Initialize Mapbox
        const initMap = async () => {
            try {
                // Set your Mapbox token here
                mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiZXJpY25pbmciLCJhIjoiY21icXlubWM1MDRiczJvb2xwM2p0amNyayJ9.n-3O6JI5nOp_Lw96ZO5vJQ';

                const mapInstance = new mapboxgl.Map({
                    container: mapContainer.current!,
                    style: isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12',
                    center: data.shops[0]?.coords || [-122.4194, 37.7749],
                    zoom: 12,
                });

                // Add markers
                data.shops.forEach(shop => {
                    const el = document.createElement('div');
                    el.className = 'marker';
                    el.style.backgroundImage = 'url(https://docs.mapbox.com/mapbox-gl-js/assets/custom_marker.png)';
                    el.style.width = '30px';
                    el.style.height = '40px';
                    el.style.backgroundSize = '100%';
                    el.style.cursor = 'pointer';

                    el.addEventListener('click', () => {
                        setSelectedShop(shop);
                    });

                    new mapboxgl.Marker(el)
                        .setLngLat(shop.coords)
                        .addTo(mapInstance);
                });

                // Fit bounds to show all markers
                if (data.shops.length > 1) {
                    const bounds = new mapboxgl.LngLatBounds();
                    data.shops.forEach(shop => bounds.extend(shop.coords));
                    mapInstance.fitBounds(bounds, { padding: 50 });
                }

                map.current = mapInstance;
            } catch (error) {
                console.error('Failed to load Mapbox:', error);
            }
        };

        initMap();

        return () => {
            if (map.current) {
                map.current.remove();
            }
        };
    }, [data, isDark]);

    if (!data) {
        return (
            <div style={{
                padding: '40px',
                textAlign: 'center',
                color: isDark ? '#fff' : '#000',
            }}>
                Loading map... {isReady ? '(SDK ready but no data)' : '(waiting for SDK)'}
            </div>
        );
    }

    const handleShopClick = async (shopId: string) => {
        // Call the show_pizza_shop tool to show shop details
        await callTool('show_pizza_shop', { shopId });
    };

    const requestFullscreenMode = async () => {
        await requestFullscreen();
    };

    return (
        <div style={{
            position: 'relative',
            height: maxHeight || '650px',
            background: isDark ? '#0a0a0a' : '#f9fafb',
            overflow: 'hidden',
        }}>
            {/* Map Container - Full Screen */}
            <div
                ref={mapContainer}
                style={{
                    position: 'absolute',
                    inset: 0,
                }}
            />

            {/* Enlarge Button */}
            <button
                onClick={requestFullscreen}
                style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    padding: '10px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Maximize2 size={18} style={{ color: '#111' }} />
            </button>

            {/* Overlay Shop Cards - Bottom */}
            <div style={{
                position: 'absolute',
                bottom: '8px',
                left: '16px',
                right: '16px',
                zIndex: 5,
                overflowX: 'auto',
                overflowY: 'hidden',
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
            }}>
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    paddingBottom: '8px',
                }}>
                    {data.shops.map(shop => (
                        <div
                            key={shop.id}
                            style={{
                                scrollSnapAlign: 'start',
                                flexShrink: 0,
                            }}
                        >
                            <CompactShopCard
                                shop={shop}
                                isSelected={selectedShop?.id === shop.id}
                                onClick={() => {
                                    setSelectedShop(shop);
                                    handleShopClick(shop.id);
                                }}
                                isDark={isDark}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
