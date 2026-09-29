'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  ExternalLink,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import {
  DEFAULT_TOOLBOX_CONTENT,
  TOOLBOX_ICON_OPTIONS,
  type ToolboxContent,
  type ToolboxIconName,
  type ToolboxMotivationalMessage,
  type ToolboxResource,
  type ToolboxUpdate,
  type ToolboxUpdateImage,
} from '@/lib/toolbox';

type ImageField = 'heroImage' | 'logoImage' | 'tourImage' | 'storyImage' | 'catalogImage';

const ICON_LABELS: Record<ToolboxIconName, string> = {
  presentation: 'Presentación',
  finishes: 'Equipamiento',
  gallery: 'Galería',
  prices: 'Precios',
  masterplan: 'Master plan',
  availability: 'Disponibilidad',
  location: 'Ubicación',
  contact: 'Contacto',
};

export function ToolboxAdminPanel({ isAdmin }: { isAdmin: boolean }) {
  const [content, setContent] = useState<ToolboxContent>(DEFAULT_TOOLBOX_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/toolbox', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No se pudo cargar el portal.');
      setContent(payload.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el portal.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = <K extends keyof ToolboxContent>(key: K, value: ToolboxContent[K]) => {
    setContent((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const updateResource = (id: string, patch: Partial<ToolboxResource>) => {
    update('resources', content.resources.map((resource) => resource.id === id ? { ...resource, ...patch } : resource));
  };

  const addResource = () => {
    const next = content.resources.length + 1;
    update('resources', [...content.resources, {
      id: `recurso-${Date.now()}`,
      title: `Nuevo recurso ${next}`,
      description: 'Describe brevemente qué encontrará el asesor.',
      href: 'https://',
      icon: 'presentation',
    }]);
  };

  const updateNotice = (id: string, patch: Partial<ToolboxUpdate>) => {
    update('updates', content.updates.map((notice) => notice.id === id ? { ...notice, ...patch } : notice));
  };

  const addNotice = () => {
    const next = content.updates.length + 1;
    update('updates', [...content.updates, {
      id: `actualizacion-${Date.now()}`,
      title: `Nueva actualización ${next}`,
      description: 'Comparte aquí la información importante para los asesores.',
      href: '',
      linkLabel: '',
    }]);
  };

  const moveNotice = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= content.updates.length) return;
    const next = [...content.updates];
    [next[index], next[target]] = [next[target], next[index]];
    update('updates', next);
  };

  const moveResource = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= content.resources.length) return;
    const next = [...content.resources];
    [next[index], next[target]] = [next[target], next[index]];
    update('resources', next);
  };

  const updateMessage = (id: string, patch: Partial<ToolboxMotivationalMessage>) => {
    update('motivationalMessages', content.motivationalMessages.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const addMessage = () => {
    update('motivationalMessages', [...content.motivationalMessages, {
      id: `mensaje-${Date.now()}`,
      message: 'Escribe aquí un mensaje breve para inspirar al equipo comercial.',
      author: 'Equipo Jardines',
    }]);
  };

  const moveMessage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= content.motivationalMessages.length) return;
    const next = [...content.motivationalMessages];
    [next[index], next[target]] = [next[target], next[index]];
    update('motivationalMessages', next);
  };

  const updateGalleryImage = (id: string, patch: Partial<ToolboxUpdateImage>) => {
    update('updateImages', content.updateImages.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const addGalleryImage = () => {
    const next = content.updateImages.length + 1;
    update('updateImages', [...content.updateImages, {
      id: `imagen-${Date.now()}`,
      image: content.catalogImage,
      alt: `Actualización visual ${next} de Jardines`,
      title: `Nueva actualización visual ${next}`,
      description: 'Describe la novedad que verá el asesor en esta imagen.',
      href: '',
      linkLabel: '',
    }]);
  };

  const moveGalleryImage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= content.updateImages.length) return;
    const next = [...content.updateImages];
    [next[index], next[target]] = [next[target], next[index]];
    update('updateImages', next);
  };

  const uploadImage = async (field: ImageField, file?: File) => {
    if (!file) return;
    setUploading(field);
    setError(null);
    const form = new FormData();
    form.append('file', file);
    form.append('slot', field);
    try {
      const response = await fetch('/api/toolbox/assets', { method: 'POST', body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No se pudo subir la imagen.');
      update(field, payload.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la imagen.');
    } finally {
      setUploading(null);
    }
  };

  const uploadGalleryImage = async (id: string, file?: File) => {
    if (!file) return;
    const uploadKey = `gallery-${id}`;
    setUploading(uploadKey);
    setError(null);
    const form = new FormData();
    form.append('file', file);
    form.append('slot', 'gallery');
    try {
      const response = await fetch('/api/toolbox/assets', { method: 'POST', body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No se pudo subir la imagen.');
      updateGalleryImage(id, { image: payload.url });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la imagen.');
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch('/api/toolbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No se pudieron guardar los cambios.');
      setContent(payload.content);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <section className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-300">Portal de asesores</p>
        <h2 className="mt-2 text-xl font-black text-white">Tu centro comercial de Jardines</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">Consulta la versión pública con los recursos seleccionados por tu administrador.</p>
        <Link href="/toolbox" target="_blank" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-gray-950 transition hover:bg-emerald-400">
          Abrir portal <ExternalLink className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  if (loading) {
    return <div className="flex min-h-56 items-center justify-center rounded-3xl border border-gray-800 bg-gray-900/70"><Loader2 className="h-6 w-6 animate-spin text-emerald-400" /></div>;
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-gray-800 bg-gray-900/75">
      <div className="flex flex-col gap-5 border-b border-gray-800 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-300">Portal de asesores</p>
          <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">Editor de Toolbox</h2>
          <p className="mt-1 text-sm text-gray-500">Actualiza la landing pública sin tocar código.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/toolbox" target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:border-gray-600">
            Vista pública <ExternalLink className="h-4 w-4" />
          </Link>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-gray-950 transition hover:bg-emerald-400 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? 'Guardando…' : saved ? 'Guardado' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-5 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 sm:mx-6">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="grid gap-7 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-7">
          <EditorSection title="Portada" description="Mensaje principal y primera impresión del portal.">
            <Field label="Nombre del desarrollo" value={content.brandName} onChange={(value) => update('brandName', value)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Identificador" value={content.heroEyebrow} onChange={(value) => update('heroEyebrow', value)} />
              <Field label="Estado del material" value={content.statusLabel} onChange={(value) => update('statusLabel', value)} />
            </div>
            <Field label="Título principal" value={content.heroTitle} onChange={(value) => update('heroTitle', value)} />
            <TextAreaField label="Descripción" value={content.heroBody} onChange={(value) => update('heroBody', value)} />
            <Field label="Texto del botón" value={content.primaryCtaLabel} onChange={(value) => update('primaryCtaLabel', value)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <ImageUploader label="Imagen principal" src={content.heroImage} loading={uploading === 'heroImage'} onUpload={(file) => uploadImage('heroImage', file)} />
              <ImageUploader label="Logotipo" src={content.logoImage} loading={uploading === 'logoImage'} contain onUpload={(file) => uploadImage('logoImage', file)} />
            </div>
          </EditorSection>

          <EditorSection title="Botones y biblioteca comercial" description="Agrega, ordena o elimina todos los accesos que necesiten los asesores.">
            <Field label="Etiqueta" value={content.resourcesEyebrow} onChange={(value) => update('resourcesEyebrow', value)} />
            <Field label="Título de sección" value={content.resourcesTitle} onChange={(value) => update('resourcesTitle', value)} />
            <TextAreaField label="Descripción de sección" value={content.resourcesBody} onChange={(value) => update('resourcesBody', value)} />

            <div className="space-y-3">
              {content.resources.map((resource, index) => (
                <div key={resource.id} className="rounded-2xl border border-gray-800 bg-gray-950/65 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Recurso {index + 1}</span>
                    <div className="flex items-center gap-1">
                      <IconButton label="Subir" disabled={index === 0} onClick={() => moveResource(index, -1)}><ArrowUp /></IconButton>
                      <IconButton label="Bajar" disabled={index === content.resources.length - 1} onClick={() => moveResource(index, 1)}><ArrowDown /></IconButton>
                      <IconButton label="Eliminar" danger onClick={() => update('resources', content.resources.filter((item) => item.id !== resource.id))}><Trash2 /></IconButton>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Nombre" value={resource.title} onChange={(value) => updateResource(resource.id, { title: value })} />
                    <SelectField label="Icono" value={resource.icon} onChange={(value) => updateResource(resource.id, { icon: value as ToolboxIconName })} />
                  </div>
                  <TextAreaField label="Descripción" value={resource.description} onChange={(value) => updateResource(resource.id, { description: value })} compact />
                  <Field label="Enlace" type="url" value={resource.href} onChange={(value) => updateResource(resource.id, { href: value })} />
                </div>
              ))}
            </div>
            <button type="button" onClick={addResource} disabled={content.resources.length >= 24} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-400 transition hover:border-emerald-500/50 hover:text-emerald-300 disabled:opacity-40">
              <Plus className="h-4 w-4" /> Agregar otro botón
            </button>
          </EditorSection>

          <EditorSection title="Mensajes motivacionales" description="Crea un carrusel breve para acompañar e inspirar al equipo comercial. Los mensajes cambian automáticamente.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Etiqueta" value={content.motivationalEyebrow} onChange={(value) => update('motivationalEyebrow', value)} />
              <Field label="Título de sección" value={content.motivationalTitle} onChange={(value) => update('motivationalTitle', value)} />
            </div>
            <div className="space-y-3">
              {content.motivationalMessages.map((message, index) => (
                <div key={message.id} className="rounded-2xl border border-gray-800 bg-gray-950/65 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Mensaje {index + 1}</span>
                    <div className="flex items-center gap-1">
                      <IconButton label="Subir" disabled={index === 0} onClick={() => moveMessage(index, -1)}><ArrowUp /></IconButton>
                      <IconButton label="Bajar" disabled={index === content.motivationalMessages.length - 1} onClick={() => moveMessage(index, 1)}><ArrowDown /></IconButton>
                      <IconButton label="Eliminar" danger onClick={() => update('motivationalMessages', content.motivationalMessages.filter((item) => item.id !== message.id))}><Trash2 /></IconButton>
                    </div>
                  </div>
                  <TextAreaField label="Mensaje" value={message.message} onChange={(value) => updateMessage(message.id, { message: value })} compact />
                  <Field label="Firma o autor" value={message.author} onChange={(value) => updateMessage(message.id, { author: value })} />
                </div>
              ))}
            </div>
            <button type="button" onClick={addMessage} disabled={content.motivationalMessages.length >= 10} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-400 transition hover:border-emerald-500/50 hover:text-emerald-300 disabled:opacity-40">
              <Plus className="h-4 w-4" /> Agregar mensaje
            </button>
          </EditorSection>

          <EditorSection title="Recorrido 360°" description="Convierte la visita virtual en el segundo gran momento de la landing.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Etiqueta" value={content.tourEyebrow} onChange={(value) => update('tourEyebrow', value)} />
              <Field label="Texto del botón" value={content.tourLabel} onChange={(value) => update('tourLabel', value)} />
            </div>
            <Field label="Título" value={content.tourTitle} onChange={(value) => update('tourTitle', value)} />
            <TextAreaField label="Descripción" value={content.tourBody} onChange={(value) => update('tourBody', value)} />
            <Field label="Enlace del tour" type="url" value={content.tourUrl} onChange={(value) => update('tourUrl', value)} />
            <ImageUploader label="Imagen del recorrido" src={content.tourImage} loading={uploading === 'tourImage'} onUpload={(file) => uploadImage('tourImage', file)} />
          </EditorSection>

          <EditorSection title="Historia del proyecto" description="Refuerza la propuesta residencial al final de la experiencia.">
            <Field label="Etiqueta" value={content.storyEyebrow} onChange={(value) => update('storyEyebrow', value)} />
            <Field label="Título" value={content.storyTitle} onChange={(value) => update('storyTitle', value)} />
            <TextAreaField label="Descripción" value={content.storyBody} onChange={(value) => update('storyBody', value)} />
            <ImageUploader label="Imagen residencial" src={content.storyImage} loading={uploading === 'storyImage'} onUpload={(file) => uploadImage('storyImage', file)} />
            <Field label="Nota de pie de página" value={content.footerNote} onChange={(value) => update('footerNote', value)} />
          </EditorSection>

          <EditorSection title="Actualizaciones para asesores" description="Publica avisos al final de la landing. Puedes incluir un botón con enlace en cada actualización.">
            <Field label="Etiqueta" value={content.updatesEyebrow} onChange={(value) => update('updatesEyebrow', value)} />
            <Field label="Título de sección" value={content.updatesTitle} onChange={(value) => update('updatesTitle', value)} />
            <TextAreaField label="Descripción de sección" value={content.updatesBody} onChange={(value) => update('updatesBody', value)} />

            <div className="space-y-3">
              {content.updates.map((notice, index) => (
                <div key={notice.id} className="rounded-2xl border border-gray-800 bg-gray-950/65 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Actualización {index + 1}</span>
                    <div className="flex items-center gap-1">
                      <IconButton label="Subir" disabled={index === 0} onClick={() => moveNotice(index, -1)}><ArrowUp /></IconButton>
                      <IconButton label="Bajar" disabled={index === content.updates.length - 1} onClick={() => moveNotice(index, 1)}><ArrowDown /></IconButton>
                      <IconButton label="Eliminar" danger onClick={() => update('updates', content.updates.filter((item) => item.id !== notice.id))}><Trash2 /></IconButton>
                    </div>
                  </div>
                  <Field label="Título" value={notice.title} onChange={(value) => updateNotice(notice.id, { title: value })} />
                  <TextAreaField label="Descripción" value={notice.description} onChange={(value) => updateNotice(notice.id, { description: value })} compact />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Enlace opcional" type="url" value={notice.href} onChange={(value) => updateNotice(notice.id, { href: value })} />
                    <Field label="Texto del botón opcional" value={notice.linkLabel} onChange={(value) => updateNotice(notice.id, { linkLabel: value })} />
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addNotice} disabled={content.updates.length >= 12} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-400 transition hover:border-emerald-500/50 hover:text-emerald-300 disabled:opacity-40">
              <Plus className="h-4 w-4" /> Agregar actualización
            </button>
          </EditorSection>

          <EditorSection title="Carrusel de imágenes y catálogo" description="Agrega imágenes de novedades. Si no hay ninguna, la landing mostrará automáticamente la imagen estática del catálogo.">
            <Field label="Etiqueta" value={content.galleryEyebrow} onChange={(value) => update('galleryEyebrow', value)} />
            <Field label="Título de sección" value={content.galleryTitle} onChange={(value) => update('galleryTitle', value)} />
            <TextAreaField label="Descripción de sección" value={content.galleryBody} onChange={(value) => update('galleryBody', value)} />
            <div className="space-y-3">
              {content.updateImages.map((item, index) => (
                <div key={item.id} className="rounded-2xl border border-gray-800 bg-gray-950/65 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Imagen {index + 1}</span>
                    <div className="flex items-center gap-1">
                      <IconButton label="Subir" disabled={index === 0} onClick={() => moveGalleryImage(index, -1)}><ArrowUp /></IconButton>
                      <IconButton label="Bajar" disabled={index === content.updateImages.length - 1} onClick={() => moveGalleryImage(index, 1)}><ArrowDown /></IconButton>
                      <IconButton label="Eliminar" danger onClick={() => update('updateImages', content.updateImages.filter((image) => image.id !== item.id))}><Trash2 /></IconButton>
                    </div>
                  </div>
                  <ImageUploader label="Imagen de la actualización" src={item.image} loading={uploading === `gallery-${item.id}`} onUpload={(file) => uploadGalleryImage(item.id, file)} />
                  <Field label="Título" value={item.title} onChange={(value) => updateGalleryImage(item.id, { title: value })} />
                  <TextAreaField label="Descripción" value={item.description} onChange={(value) => updateGalleryImage(item.id, { description: value })} compact />
                  <Field label="Texto alternativo de la imagen" value={item.alt} onChange={(value) => updateGalleryImage(item.id, { alt: value })} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Enlace opcional" type="url" value={item.href} onChange={(value) => updateGalleryImage(item.id, { href: value })} />
                    <Field label="Texto del botón opcional" value={item.linkLabel} onChange={(value) => updateGalleryImage(item.id, { linkLabel: value })} />
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addGalleryImage} disabled={content.updateImages.length >= 12} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-400 transition hover:border-emerald-500/50 hover:text-emerald-300 disabled:opacity-40">
              <Plus className="h-4 w-4" /> Agregar imagen al carrusel
            </button>
            <div className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div>
                <p className="text-sm font-bold text-emerald-200">Vista estática de catálogo</p>
                <p className="mt-1 text-xs leading-5 text-gray-500">Se muestra únicamente cuando el carrusel de imágenes está vacío.</p>
              </div>
              <ImageUploader label="Imagen del catálogo" src={content.catalogImage} loading={uploading === 'catalogImage'} onUpload={(file) => uploadImage('catalogImage', file)} />
              <Field label="Título" value={content.catalogTitle} onChange={(value) => update('catalogTitle', value)} />
              <TextAreaField label="Descripción" value={content.catalogBody} onChange={(value) => update('catalogBody', value)} compact />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Enlace opcional" type="url" value={content.catalogHref} onChange={(value) => update('catalogHref', value)} />
                <Field label="Texto del botón" value={content.catalogLinkLabel} onChange={(value) => update('catalogLinkLabel', value)} />
              </div>
            </div>
          </EditorSection>
        </div>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="overflow-hidden rounded-3xl border border-gray-800 bg-gray-950 shadow-2xl shadow-black/20">
            <div className="relative aspect-[4/5]">
              <Image src={content.heroImage} alt="Vista previa del portal" fill sizes="360px" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/20" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-300">{content.heroEyebrow}</p>
                <p className="mt-3 text-3xl font-semibold leading-none tracking-tight text-white">{content.heroTitle}</p>
                <p className="mt-3 line-clamp-3 text-xs leading-5 text-white/70">{content.heroBody}</p>
              </div>
            </div>
            <div className="p-4 text-xs leading-5 text-gray-500">
              Vista rápida. Abre la página pública para revisar el resultado completo en escritorio y móvil.
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function EditorSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-2xl border border-gray-800 bg-gray-950/35 p-4 sm:p-5">
      <div>
        <h3 className="font-bold text-white">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: 'text' | 'url' }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-200 outline-none transition placeholder:text-gray-700 focus:border-emerald-500" />
    </label>
  );
}

function TextAreaField({ label, value, onChange, compact }: { label: string; value: string; onChange: (value: string) => void; compact?: boolean }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <textarea value={value} rows={compact ? 2 : 3} onChange={(event) => onChange(event.target.value)} className="w-full resize-y rounded-xl border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm leading-6 text-gray-200 outline-none transition focus:border-emerald-500" />
    </label>
  );
}

function SelectField({ label, value, onChange }: { label: string; value: ToolboxIconName; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-200 outline-none transition focus:border-emerald-500">
        {TOOLBOX_ICON_OPTIONS.map((icon) => <option key={icon} value={icon}>{ICON_LABELS[icon]}</option>)}
      </select>
    </label>
  );
}

function ImageUploader({ label, src, loading, contain, onUpload }: { label: string; src: string; loading: boolean; contain?: boolean; onUpload: (file?: File) => void }) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <label className="group relative block aspect-[16/9] cursor-pointer overflow-hidden rounded-xl border border-gray-700 bg-gray-900">
        <Image src={src} alt={label} fill sizes="320px" className={contain ? 'object-contain p-5' : 'object-cover'} />
        <span className="absolute inset-0 flex items-center justify-center gap-2 bg-black/55 text-sm font-semibold text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {loading ? 'Subiendo…' : 'Cambiar imagen'}
        </span>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={loading} className="sr-only" onChange={(event) => onUpload(event.target.files?.[0])} />
      </label>
    </div>
  );
}

function IconButton({ label, disabled, danger, onClick, children }: { label: string; disabled?: boolean; danger?: boolean; onClick: () => void; children: React.ReactElement }) {
  return (
    <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className={`grid h-8 w-8 place-items-center rounded-lg border transition disabled:opacity-25 ${danger ? 'border-red-500/20 text-red-400 hover:bg-red-500/10' : 'border-gray-700 text-gray-500 hover:bg-gray-800 hover:text-white'}`}>
      <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{children}</span>
    </button>
  );
}
