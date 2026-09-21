import AppShell from '../components/AppShell';
import ClientWidgetLayout from './ClientWidgetLayout';
import './globals.css';

export const metadata = {
    title: 'Memora | Autonomous Study Platform',
    description: 'Calculates the 80/20 Pareto distribution and autonomously generates non-repeating study modalities.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <ClientWidgetLayout>
                    {children}
                </ClientWidgetLayout>
            </body>
        </html>
    );
}
