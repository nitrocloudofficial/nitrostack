import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ProjectManager AI Widget',
  description: 'Interactive Multi-Agent Project Planning Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full w-full flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-x-hidden">
        <div className="w-full h-full flex flex-col justify-center">
          {children}
        </div>
      </body>
    </html>
  );
}