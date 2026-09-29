export const TOOLBOX_SLUG = 'jardines-ciudad-mayakoba';

export const TOOLBOX_ICON_OPTIONS = [
  'presentation', 'finishes', 'gallery', 'prices',
  'masterplan', 'availability', 'location', 'contact',
] as const;

export type ToolboxIconName = typeof TOOLBOX_ICON_OPTIONS[number];

export interface ToolboxResource {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: ToolboxIconName;
}

export interface ToolboxUpdate {
  id: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}

export interface ToolboxMotivationalMessage {
  id: string;
  message: string;
  author: string;
}

export interface ToolboxUpdateImage {
  id: string;
  image: string;
  alt: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}

export interface ToolboxContent {
  brandName: string;
  heroEyebrow: string;
  heroTitle: string;
  heroBody: string;
  heroImage: string;
  logoImage: string;
  primaryCtaLabel: string;
  statusLabel: string;
  resourcesEyebrow: string;
  resourcesTitle: string;
  resourcesBody: string;
  resources: ToolboxResource[];
  tourEyebrow: string;
  tourTitle: string;
  tourBody: string;
  tourLabel: string;
  tourUrl: string;
  tourImage: string;
  storyEyebrow: string;
  storyTitle: string;
  storyBody: string;
  storyImage: string;
  updatesEyebrow: string;
  updatesTitle: string;
  updatesBody: string;
  updates: ToolboxUpdate[];
  motivationalEyebrow: string;
  motivationalTitle: string;
  motivationalMessages: ToolboxMotivationalMessage[];
  galleryEyebrow: string;
  galleryTitle: string;
  galleryBody: string;
  updateImages: ToolboxUpdateImage[];
  catalogImage: string;
  catalogTitle: string;
  catalogBody: string;
  catalogHref: string;
  catalogLinkLabel: string;
  footerNote: string;
}

export const DEFAULT_TOOLBOX_CONTENT: ToolboxContent = {
  brandName: 'Jardines de Ciudad Mayakoba',
  heroEyebrow: 'Portal privado para asesores',
  heroTitle: 'Todo lo que necesitas para cerrar mejor.',
  heroBody: 'Material comercial, disponibilidad, imágenes y experiencias de venta reunidas en un solo lugar.',
  heroImage: '/toolbox/jardines-entrada.avif',
  logoImage: '/toolbox/ciudad-mayakoba-logo.png',
  primaryCtaLabel: 'Explorar herramientas',
  statusLabel: 'Material comercial vigente',
  resourcesEyebrow: 'Centro de venta',
  resourcesTitle: 'Información lista para cada conversación.',
  resourcesBody: 'Accede a los recursos esenciales de Jardines y comparte información consistente con cada prospecto.',
  resources: [
    {
      id: 'presentacion',
      title: 'Presentación',
      description: 'La historia, propuesta de valor y atributos del desarrollo.',
      href: 'https://www.jardinesdeciudadmayakoba.com/_files/ugd/e411e2_a305ae12cdbd4723a2290a06c907883c.pdf',
      icon: 'presentation',
    },
    {
      id: 'equipamiento',
      title: 'Equipamiento',
      description: 'Acabados, especificaciones y detalles de las unidades.',
      href: 'https://drive.google.com/drive/folders/1wbqD9RxGXlhwB6n7WFbOGuO3O3HnGgNY?usp=sharing',
      icon: 'finishes',
    },
    {
      id: 'galeria',
      title: 'Galería',
      description: 'Fotografías y recursos visuales listos para compartir.',
      href: 'https://drive.google.com/drive/folders/1jM8FAlif_N9wFfpfKoh2PSaBO_lnrgjt?usp=sharing',
      icon: 'gallery',
    },
    {
      id: 'precios',
      title: 'Precios',
      description: 'Consulta la información comercial y condiciones vigentes.',
      href: 'https://drive.google.com/drive/folders/15wRmDSSGuKdn_8mhvuB3guW03YPlmQfb?usp=sharing',
      icon: 'prices',
    },
    {
      id: 'master-plan',
      title: 'Master plan',
      description: 'Comprende el proyecto, sus etapas y distribución general.',
      href: 'https://drive.google.com/file/d/1lfG3cTOXA5auTzGfG_L9sWUMsH4-IwC1/view?usp=sharing',
      icon: 'masterplan',
    },
    {
      id: 'sembrado',
      title: 'Sembrado',
      description: 'Ubicación y disponibilidad para orientar cada propuesta.',
      href: 'https://drive.google.com/drive/folders/1WiNI4akn81bxs4g6ReGUEfrfgy_uKgim?usp=sharing',
      icon: 'availability',
    },
  ],
  tourEyebrow: 'Experiencia inmersiva',
  tourTitle: 'Haz que tu cliente se imagine aquí.',
  tourBody: 'Recorre Jardines en 360° y presenta el proyecto desde cualquier lugar.',
  tourLabel: 'Iniciar recorrido 360°',
  tourUrl: 'https://kuula.co/share/collection/717HS?fs=1&info=1&initload=0&inst=es&logo=1&sd=1&thumbs=1&vr=0',
  tourImage: '/toolbox/jardines-naturaleza.avif',
  storyEyebrow: 'Vivir Ciudad Mayakoba',
  storyTitle: 'Naturaleza, comunidad y plusvalía en un mismo entorno.',
  storyBody: 'Una propuesta residencial en Playa del Carmen diseñada para vivir bien e invertir con visión de largo plazo.',
  storyImage: '/toolbox/jardines-interior.avif',
  updatesEyebrow: 'Información vigente',
  updatesTitle: 'Actualizaciones para asesores.',
  updatesBody: 'Consulta aquí avisos comerciales, cambios importantes y nuevos materiales del desarrollo.',
  updates: [],
  motivationalEyebrow: 'Impulso comercial',
  motivationalTitle: 'Una idea para tu próxima conversación.',
  motivationalMessages: [
    {
      id: 'confianza',
      message: 'La confianza se construye con información clara, vigente y oportuna.',
      author: 'Equipo Jardines',
    },
    {
      id: 'historia',
      message: 'Cada recorrido bien contado acerca a una familia a su próximo hogar.',
      author: 'Jardines de Ciudad Mayakoba',
    },
    {
      id: 'seguridad',
      message: 'Conocer el proyecto es la mejor herramienta para cerrar con seguridad.',
      author: 'Ciudad Mayakoba',
    },
  ],
  galleryEyebrow: 'Novedades visuales',
  galleryTitle: 'Actualizaciones y catálogo.',
  galleryBody: 'Consulta las imágenes más recientes del desarrollo y compártelas con tus prospectos.',
  updateImages: [],
  catalogImage: '/toolbox/jardines-interior.avif',
  catalogTitle: 'Catálogo comercial de Jardines',
  catalogBody: 'Una vista general del estilo de vida, los espacios y la propuesta residencial del desarrollo.',
  catalogHref: '',
  catalogLinkLabel: 'Consultar catálogo',
  footerNote: 'Portal comercial para asesores de Jardines de Ciudad Mayakoba.',
};

function safeText(value: unknown, fallback: string, max = 240): string {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
}

function safeUrl(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const url = value.trim();
  if (url.startsWith('/')) return url.slice(0, 1000);
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? url.slice(0, 1000) : fallback;
  } catch {
    return fallback;
  }
}

function safeOptionalText(value: unknown, max = 240): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function safeOptionalUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  return safeUrl(value, '');
}

export function sanitizeToolboxContent(value: unknown): ToolboxContent {
  const input = value && typeof value === 'object' ? value as Partial<ToolboxContent> : {};
  const defaults = DEFAULT_TOOLBOX_CONTENT;
  const rawResources = Array.isArray(input.resources) ? input.resources.slice(0, 24) : defaults.resources;
  const resources = rawResources.map((resource, index): ToolboxResource => {
    const raw = resource && typeof resource === 'object' ? resource as Partial<ToolboxResource> : {};
    const fallback = defaults.resources[index] ?? defaults.resources[0];
    const icon = TOOLBOX_ICON_OPTIONS.includes(raw.icon as ToolboxIconName) ? raw.icon as ToolboxIconName : fallback.icon;
    return {
      id: safeText(raw.id, `recurso-${index + 1}`, 80).replace(/[^a-zA-Z0-9_-]/g, '-'),
      title: safeText(raw.title, fallback.title, 80),
      description: safeText(raw.description, fallback.description, 180),
      href: safeUrl(raw.href, fallback.href),
      icon,
    };
  });
  const rawUpdates = Array.isArray(input.updates) ? input.updates.slice(0, 12) : defaults.updates;
  const updates = rawUpdates.map((update, index): ToolboxUpdate => {
    const raw = update && typeof update === 'object' ? update as Partial<ToolboxUpdate> : {};
    return {
      id: safeText(raw.id, `actualizacion-${index + 1}`, 80).replace(/[^a-zA-Z0-9_-]/g, '-'),
      title: safeText(raw.title, `Actualización ${index + 1}`, 100),
      description: safeText(raw.description, 'Información importante para el equipo comercial.', 320),
      href: safeOptionalUrl(raw.href),
      linkLabel: safeOptionalText(raw.linkLabel, 60),
    };
  });
  const rawMessages = Array.isArray(input.motivationalMessages) ? input.motivationalMessages.slice(0, 10) : defaults.motivationalMessages;
  const motivationalMessages = rawMessages.map((message, index): ToolboxMotivationalMessage => {
    const raw = message && typeof message === 'object' ? message as Partial<ToolboxMotivationalMessage> : {};
    const fallback = defaults.motivationalMessages[index] ?? defaults.motivationalMessages[0];
    return {
      id: safeText(raw.id, `mensaje-${index + 1}`, 80).replace(/[^a-zA-Z0-9_-]/g, '-'),
      message: safeText(raw.message, fallback.message, 240),
      author: safeText(raw.author, fallback.author, 100),
    };
  });
  const rawUpdateImages = Array.isArray(input.updateImages) ? input.updateImages.slice(0, 12) : defaults.updateImages;
  const updateImages = rawUpdateImages.reduce<ToolboxUpdateImage[]>((items, item, index) => {
    const raw = item && typeof item === 'object' ? item as Partial<ToolboxUpdateImage> : {};
    const image = safeUrl(raw.image, '');
    if (!image) return items;
    items.push({
      id: safeText(raw.id, `imagen-${index + 1}`, 80).replace(/[^a-zA-Z0-9_-]/g, '-'),
      image,
      alt: safeText(raw.alt, `Actualización visual ${index + 1} de Jardines`, 140),
      title: safeText(raw.title, `Actualización ${index + 1}`, 120),
      description: safeText(raw.description, 'Novedades para el equipo comercial.', 280),
      href: safeOptionalUrl(raw.href),
      linkLabel: safeOptionalText(raw.linkLabel, 60),
    });
    return items;
  }, []);

  return {
    brandName: safeText(input.brandName, defaults.brandName, 100),
    heroEyebrow: safeText(input.heroEyebrow, defaults.heroEyebrow, 100),
    heroTitle: safeText(input.heroTitle, defaults.heroTitle, 140),
    heroBody: safeText(input.heroBody, defaults.heroBody, 280),
    heroImage: safeUrl(input.heroImage, defaults.heroImage),
    logoImage: safeUrl(input.logoImage, defaults.logoImage),
    primaryCtaLabel: safeText(input.primaryCtaLabel, defaults.primaryCtaLabel, 60),
    statusLabel: safeText(input.statusLabel, defaults.statusLabel, 80),
    resourcesEyebrow: safeText(input.resourcesEyebrow, defaults.resourcesEyebrow, 80),
    resourcesTitle: safeText(input.resourcesTitle, defaults.resourcesTitle, 140),
    resourcesBody: safeText(input.resourcesBody, defaults.resourcesBody, 280),
    resources,
    tourEyebrow: safeText(input.tourEyebrow, defaults.tourEyebrow, 80),
    tourTitle: safeText(input.tourTitle, defaults.tourTitle, 140),
    tourBody: safeText(input.tourBody, defaults.tourBody, 240),
    tourLabel: safeText(input.tourLabel, defaults.tourLabel, 60),
    tourUrl: safeUrl(input.tourUrl, defaults.tourUrl),
    tourImage: safeUrl(input.tourImage, defaults.tourImage),
    storyEyebrow: safeText(input.storyEyebrow, defaults.storyEyebrow, 80),
    storyTitle: safeText(input.storyTitle, defaults.storyTitle, 160),
    storyBody: safeText(input.storyBody, defaults.storyBody, 280),
    storyImage: safeUrl(input.storyImage, defaults.storyImage),
    updatesEyebrow: safeText(input.updatesEyebrow, defaults.updatesEyebrow, 80),
    updatesTitle: safeText(input.updatesTitle, defaults.updatesTitle, 140),
    updatesBody: safeText(input.updatesBody, defaults.updatesBody, 280),
    updates,
    motivationalEyebrow: safeText(input.motivationalEyebrow, defaults.motivationalEyebrow, 80),
    motivationalTitle: safeText(input.motivationalTitle, defaults.motivationalTitle, 140),
    motivationalMessages,
    galleryEyebrow: safeText(input.galleryEyebrow, defaults.galleryEyebrow, 80),
    galleryTitle: safeText(input.galleryTitle, defaults.galleryTitle, 140),
    galleryBody: safeText(input.galleryBody, defaults.galleryBody, 280),
    updateImages,
    catalogImage: safeUrl(input.catalogImage, defaults.catalogImage),
    catalogTitle: safeText(input.catalogTitle, defaults.catalogTitle, 140),
    catalogBody: safeText(input.catalogBody, defaults.catalogBody, 280),
    catalogHref: safeOptionalUrl(input.catalogHref),
    catalogLinkLabel: safeText(input.catalogLinkLabel, defaults.catalogLinkLabel, 60),
    footerNote: safeText(input.footerNote, defaults.footerNote, 180),
  };
}
