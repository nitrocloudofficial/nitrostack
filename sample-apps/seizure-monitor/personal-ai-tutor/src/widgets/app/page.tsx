import Link from 'next/link';

const links = [
    { href: '/pizza-list', label: 'Pizza Shops List', description: 'Browse pizza shops in a card-based list' },
    { href: '/pizza-map', label: 'Pizza Shop Map', description: 'Explore locations on an interactive map' },
    { href: '/pizza-shop', label: 'Shop Details', description: 'View detailed information for a selected shop' },
];

export default function HomePage() {
    return (
        <main style={{ minHeight: '100vh', padding: '32px 20px', background: '#f9fafb', color: '#111827' }}>
            <div style={{ maxWidth: '720px', margin: '0 auto' }}>
                <h1 style={{ margin: '0 0 8px', fontSize: '28px' }}>🍕 Pizza Widgets</h1>
                <p style={{ margin: '0 0 20px', fontSize: '16px', color: '#4b5563' }}>
                    Choose a widget view to explore the pizza experience.
                </p>

                <div style={{ display: 'grid', gap: '12px' }}>
                    {links.map(link => (
                        <Link
                            key={link.href}
                            href={link.href}
                            style={{
                                display: 'block',
                                padding: '16px 18px',
                                borderRadius: '12px',
                                background: '#ffffff',
                                border: '1px solid #e5e7eb',
                                textDecoration: 'none',
                                color: '#111827',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            }}
                        >
                            <div style={{ fontSize: '16px', fontWeight: 700 }}>{link.label}</div>
                            <div style={{ marginTop: '4px', fontSize: '14px', color: '#6b7280' }}>{link.description}</div>
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    );
}
