import type { Metadata } from 'next';
import { getPublicToolboxContent } from '@/lib/toolboxServer';
import { ToolboxLanding } from './ToolboxLanding';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Portal de asesores | Jardines de Ciudad Mayakoba',
  description: 'Material comercial, precios, galería, master plan y recorrido 360 para asesores de Jardines de Ciudad Mayakoba.',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default async function ToolboxPage() {
  const content = await getPublicToolboxContent();
  return <ToolboxLanding content={content} />;
}
