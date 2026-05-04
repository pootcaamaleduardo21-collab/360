import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Eleva360 | Tours Virtuales 360° que Venden',
  description: 'Crea y publica tours virtuales 360° con hotspots, IA de voz, analytics y booking integrados.',
  openGraph: {
    title: 'Eleva360 — Tours Virtuales 360°',
    description: 'Tours virtuales inmersivos con IA de texto, voz, analytics y booking integrados.',
    type: 'website',
  },
};

// ⚠️ Critical for mobile: without this, browsers render the page at ~980px
// and scale it down, making everything tiny and unusable on phones.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,  // allow pinch-zoom for accessibility
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
