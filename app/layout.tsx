import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tour 360° | Plataforma de Tours Virtuales',
  description: 'Crea y comparte tours virtuales 360° para Real Estate, arquitectura y locales comerciales.',
  openGraph: {
    title: 'Tour 360° Platform',
    description: 'Tours virtuales inmersivos para bienes raíces y arquitectura.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
