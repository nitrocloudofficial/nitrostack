'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const WidgetLayout = dynamic(
    () => import('@nitrostack/widgets').then((mod) => mod.WidgetLayout),
    { ssr: false }
);

export default function ClientWidgetLayout({ children }: { children: React.ReactNode }) {
    return <WidgetLayout>{children}</WidgetLayout>;
}
