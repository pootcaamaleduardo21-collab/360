import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Read a File as a data URL (for local image preview) */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Create an object URL and return a cleanup function */
export function createObjectURL(file: File): { url: string; revoke: () => void } {
  const url = URL.createObjectURL(file);
  return { url, revoke: () => URL.revokeObjectURL(url) };
}

/** Generate a simple embed iframe snippet */
export function generateEmbedCode(tourId: string, baseUrl: string): string {
  return `<iframe
  src="${baseUrl}/viewer/${tourId}"
  width="100%"
  height="600"
  frameborder="0"
  allowfullscreen
  allow="xr-spatial-tracking"
  title="Tour Virtual 360°"
></iframe>`;
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
