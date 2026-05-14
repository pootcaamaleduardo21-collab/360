import type { Tour } from '@/types/tour.types';
import { uploadSceneDataUrl, uploadThumbnail } from './storage';

function isDataUrl(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('data:image/');
}

function imageExtFromDataUrl(dataUrl: string): 'jpg' | 'png' {
  return dataUrl.startsWith('data:image/png') ? 'png' : 'jpg';
}

export function tourHasEmbeddedImages(tour: Tour): boolean {
  return (tour.scenes ?? []).some((scene) =>
    isDataUrl(scene.imageUrl) ||
    isDataUrl(scene.thumbnailUrl) ||
    isDataUrl(scene.originalImageUrl) ||
    isDataUrl(scene.nadirLogoUrl)
  );
}

export async function externalizeEmbeddedTourImages(tour: Tour): Promise<Tour> {
  const scenes = await Promise.all((tour.scenes ?? []).map(async (scene) => {
    const patch: Partial<typeof scene> = {};

    if (isDataUrl(scene.imageUrl)) {
      const result = await uploadSceneDataUrl(tour.id, scene.imageUrl, imageExtFromDataUrl(scene.imageUrl));
      patch.imageUrl = result.url;
    }

    if (isDataUrl(scene.thumbnailUrl)) {
      const result = await uploadThumbnail(tour.id, scene.thumbnailUrl);
      patch.thumbnailUrl = result.url;
    }

    if (isDataUrl(scene.originalImageUrl)) {
      const result = await uploadSceneDataUrl(tour.id, scene.originalImageUrl, imageExtFromDataUrl(scene.originalImageUrl));
      patch.originalImageUrl = result.url;
    }

    if (isDataUrl(scene.nadirLogoUrl)) {
      const result = await uploadThumbnail(tour.id, scene.nadirLogoUrl);
      patch.nadirLogoUrl = result.url;
    }

    return Object.keys(patch).length > 0 ? { ...scene, ...patch } : scene;
  }));

  return { ...tour, scenes, updatedAt: new Date().toISOString() };
}
