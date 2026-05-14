import type { Tour } from '@/types/tour.types';
import { uploadSceneDataUrl, uploadThumbnail } from './storage';

const DATA_URL_RE = /^data:image\//;

function isDataUrl(value: unknown): value is string {
  return typeof value === 'string' && DATA_URL_RE.test(value);
}

function imageExtFromDataUrl(dataUrl: string): 'jpg' | 'png' {
  return dataUrl.startsWith('data:image/png') ? 'png' : 'jpg';
}

async function uploadEmbeddedImage(tourId: string, dataUrl: string, preferSceneBucket = false): Promise<string> {
  const result = preferSceneBucket
    ? await uploadSceneDataUrl(tourId, dataUrl, imageExtFromDataUrl(dataUrl))
    : await uploadThumbnail(tourId, dataUrl);

  return result.url;
}

function hasEmbeddedImagesDeep(value: unknown): boolean {
  if (isDataUrl(value)) return true;
  if (Array.isArray(value)) return value.some(hasEmbeddedImagesDeep);
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).some(hasEmbeddedImagesDeep);
}

export function tourHasEmbeddedImages(tour: Tour): boolean {
  return hasEmbeddedImagesDeep(tour);
}

export async function externalizeEmbeddedTourImages(tour: Tour): Promise<Tour> {
  const scenes = await Promise.all((tour.scenes ?? []).map(async (scene) => {
    const patch: Partial<typeof scene> = {};

    if (isDataUrl(scene.imageUrl)) {
      patch.imageUrl = await uploadEmbeddedImage(tour.id, scene.imageUrl, true);
    }

    if (isDataUrl(scene.thumbnailUrl)) {
      patch.thumbnailUrl = await uploadEmbeddedImage(tour.id, scene.thumbnailUrl);
    }

    if (isDataUrl(scene.originalImageUrl)) {
      patch.originalImageUrl = await uploadEmbeddedImage(tour.id, scene.originalImageUrl, true);
    }

    if (isDataUrl(scene.nadirLogoUrl)) {
      patch.nadirLogoUrl = await uploadEmbeddedImage(tour.id, scene.nadirLogoUrl);
    }

    const hotspots = await Promise.all((scene.hotspots ?? []).map(async (hotspot) => {
      const hotspotPatch: Partial<typeof hotspot> = {};

      if (hotspot.media && isDataUrl(hotspot.media.url)) {
        hotspotPatch.media = {
          ...hotspot.media,
          url: await uploadEmbeddedImage(tour.id, hotspot.media.url),
        };
      }

      if (hotspot.agent && isDataUrl(hotspot.agent.photoUrl)) {
        hotspotPatch.agent = {
          ...hotspot.agent,
          photoUrl: await uploadEmbeddedImage(tour.id, hotspot.agent.photoUrl),
        };
      }

      if (hotspot.product && isDataUrl(hotspot.product.imageUrl)) {
        hotspotPatch.product = {
          ...hotspot.product,
          imageUrl: await uploadEmbeddedImage(tour.id, hotspot.product.imageUrl),
        };
      }

      return Object.keys(hotspotPatch).length > 0 ? { ...hotspot, ...hotspotPatch } : hotspot;
    }));

    return Object.keys(patch).length > 0 || hotspots !== scene.hotspots
      ? { ...scene, ...patch, hotspots }
      : scene;
  }));

  const unitPrototypes = await Promise.all((tour.unitPrototypes ?? []).map(async (prototype) => (
    isDataUrl(prototype.floorPlanUrl)
      ? { ...prototype, floorPlanUrl: await uploadEmbeddedImage(tour.id, prototype.floorPlanUrl) }
      : prototype
  )));

  const units = await Promise.all((tour.units ?? []).map(async (unit) => (
    isDataUrl(unit.floorPlanUrl)
      ? { ...unit, floorPlanUrl: await uploadEmbeddedImage(tour.id, unit.floorPlanUrl) }
      : unit
  )));

  const gallery = await Promise.all((tour.gallery ?? []).map(async (item) => {
    const patch: Partial<typeof item> = {};
    if (isDataUrl(item.url)) patch.url = await uploadEmbeddedImage(tour.id, item.url);
    if (isDataUrl(item.thumbnail)) patch.thumbnail = await uploadEmbeddedImage(tour.id, item.thumbnail);
    return Object.keys(patch).length > 0 ? { ...item, ...patch } : item;
  }));

  const salesAdvisor = tour.salesAdvisor && isDataUrl(tour.salesAdvisor.photoUrl)
    ? { ...tour.salesAdvisor, photoUrl: await uploadEmbeddedImage(tour.id, tour.salesAdvisor.photoUrl) }
    : tour.salesAdvisor;

  return {
    ...tour,
    scenes,
    ...(isDataUrl(tour.floorPlanUrl) ? { floorPlanUrl: await uploadEmbeddedImage(tour.id, tour.floorPlanUrl) } : {}),
    ...(isDataUrl(tour.logoUrl) ? { logoUrl: await uploadEmbeddedImage(tour.id, tour.logoUrl) } : {}),
    ...(isDataUrl(tour.brochureUrl) ? { brochureUrl: await uploadEmbeddedImage(tour.id, tour.brochureUrl) } : {}),
    ...(tour.unitPrototypes ? { unitPrototypes } : {}),
    ...(tour.units ? { units } : {}),
    ...(tour.gallery ? { gallery } : {}),
    ...(salesAdvisor ? { salesAdvisor } : {}),
    updatedAt: new Date().toISOString(),
  };
}
