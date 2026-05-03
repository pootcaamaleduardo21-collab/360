'use client';

import { useState } from 'react';
import { Tour, GalleryItem, PointOfInterest, POICategory, SocialLinks } from '@/types/tour.types';
import { POI_CONFIG } from '@/lib/poiTypes';
import { NicheType } from '@/lib/niches';
import { NicheSelector } from '@/components/editor/NicheSelector';
import { useTourStore } from '@/store/tourStore';
import { useAuth } from '@/hooks/useAuth';
import { getUserRole } from '@/lib/roles';
import { uploadAsset } from '@/lib/storage';
import { cn } from '@/lib/utils';
import {
  Palette, Images, FileText, MapPin, Globe,
  Plus, Trash2, Upload, Loader2, Link, X,
} from 'lucide-react';

// ─── Sub-tab types ────────────────────────────────────────────────────────────

type BrandTab = 'brand' | 'gallery' | 'brochure' | 'poi';

const BRAND_TABS: { id: BrandTab; label: string; icon: React.ReactNode }[] = [
  { id: 'brand',   label: 'Marca',    icon: <Palette  className="w-3 h-3" /> },
  { id: 'gallery', label: 'Galería',  icon: <Images   className="w-3 h-3" /> },
  { id: 'brochure',label: 'Brochure', icon: <FileText className="w-3 h-3" /> },
  { id: 'poi',     label: 'Lugares',  icon: <MapPin   className="w-3 h-3" /> },
];

const POI_CATEGORIES = Object.entries(POI_CONFIG) as [POICategory, typeof POI_CONFIG[POICategory]][];

// ─── Component ────────────────────────────────────────────────────────────────

export function BrandingPanel({ tour }: { tour: Tour }) {
  const updateTour = useTourStore((s) => s.updateTour);
  const [activeTab, setActiveTab] = useState<BrandTab>('brand');

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const updateGallery = (items: GalleryItem[]) => updateTour({ gallery: items });
  const updatePOIs    = (items: PointOfInterest[]) => updateTour({ pointsOfInterest: items });

  return (
    <div className="space-y-3">
      {/* Sub-tab nav */}
      <div className="grid grid-cols-4 gap-1 bg-gray-800/50 rounded-xl p-1">
        {BRAND_TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors',
              activeTab === id
                ? 'bg-gray-700 text-white'
                : 'text-gray-500 hover:text-gray-300'
            )}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* ── Brand & Social ──────────────────────────────────────────────────── */}
      {activeTab === 'brand' && (
        <BrandTab tour={tour} updateTour={updateTour} />
      )}

      {/* ── Gallery ────────────────────────────────────────────────────────── */}
      {activeTab === 'gallery' && (
        <GalleryTab tour={tour} items={tour.gallery ?? []} onUpdate={updateGallery} />
      )}

      {/* ── Brochure ───────────────────────────────────────────────────────── */}
      {activeTab === 'brochure' && (
        <BrochureTab tour={tour} updateTour={updateTour} />
      )}

      {/* ── POI ────────────────────────────────────────────────────────────── */}
      {activeTab === 'poi' && (
        <POITab items={tour.pointsOfInterest ?? []} onUpdate={updatePOIs} />
      )}
    </div>
  );
}

// ─── Brand tab ────────────────────────────────────────────────────────────────

function BrandTab({ tour, updateTour }: { tour: Tour; updateTour: (p: Partial<Omit<Tour, 'id' | 'scenes'>>) => void }) {
  const social = tour.socialLinks ?? {};
  const { user } = useAuth();
  const role = getUserRole(user);
  const canEditNiche = role === 'super_admin' || role === 'admin';

  const updateSocial = (patch: Partial<SocialLinks>) =>
    updateTour({ socialLinks: { ...social, ...patch } });

  return (
    <div className="space-y-3">
      {/* Niche selector — only for admins and super_admins */}
      {canEditNiche && (
        <div className="rounded-xl bg-gray-800/50 border border-gray-700/50 p-3">
          <NicheSelector
            value={tour.niche}
            onChange={(niche: NicheType) => updateTour({ niche })}
          />
        </div>
      )}

      <div className="border-t border-gray-800 pt-3" />

      <Field label="Nombre de la empresa">
        <input
          type="text"
          value={tour.brandName ?? ''}
          onChange={(e) => updateTour({ brandName: e.target.value })}
          className="input-dark"
          placeholder="Inmobiliaria Ejemplo"
        />
      </Field>

      <Field label="Tagline / Slogan">
        <input
          type="text"
          value={tour.tagline ?? ''}
          onChange={(e) => updateTour({ tagline: e.target.value })}
          className="input-dark"
          placeholder="Vive el hogar de tus sueños"
        />
      </Field>

      <Field label="URL del logo">
        <input
          type="url"
          value={tour.logoUrl ?? ''}
          onChange={(e) => updateTour({ logoUrl: e.target.value })}
          className="input-dark"
          placeholder="https://…"
        />
      </Field>

      <Field label="Color de marca">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={tour.brandColor ?? '#1e40af'}
            onChange={(e) => updateTour({ brandColor: e.target.value })}
            className="w-10 h-9 rounded-lg cursor-pointer border border-gray-700 bg-transparent p-0.5"
          />
          <input
            type="text"
            value={tour.brandColor ?? '#1e40af'}
            onChange={(e) => updateTour({ brandColor: e.target.value })}
            className="input-dark font-mono uppercase flex-1"
            placeholder="#1e40af"
            maxLength={7}
          />
        </div>
      </Field>

      {/* Brand preview */}
      {(tour.brandColor || tour.brandName) && (
        <div
          className="rounded-xl p-3 flex items-center gap-3 text-white"
          style={{ background: tour.brandColor ?? '#1e40af' }}
        >
          {tour.logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={tour.logoUrl} alt="" className="w-8 h-8 rounded-lg object-contain bg-white/20 p-0.5" />
            : <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-black text-sm">
                {(tour.brandName ?? tour.title).charAt(0)}
              </div>
          }
          <div>
            <p className="text-sm font-bold leading-tight">{tour.brandName ?? tour.title}</p>
            {tour.tagline && <p className="text-white/70 text-[10px]">{tour.tagline}</p>}
          </div>
        </div>
      )}

      <div className="border-t border-gray-800 pt-3 space-y-2">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <Globe className="w-3 h-3" /> Redes sociales y contacto
        </p>
        {([
          ['website',   'Sitio web',   'https://miempresa.com'],
          ['facebook',  'Facebook',    'https://facebook.com/…'],
          ['instagram', 'Instagram',   'https://instagram.com/…'],
          ['youtube',   'YouTube',     'https://youtube.com/…'],
          ['tiktok',    'TikTok',      'https://tiktok.com/…'],
          ['whatsapp',  'WhatsApp',    '+52 55 1234 5678'],
        ] as const).map(([key, label, placeholder]) => (
          <div key={key} className="flex items-center gap-2">
            <Link className="w-3 h-3 text-gray-600 flex-shrink-0" />
            <div className="flex-1 space-y-0.5">
              <p className="text-[10px] text-gray-500">{label}</p>
              <input
                type={key === 'whatsapp' ? 'tel' : 'url'}
                value={social[key] ?? ''}
                onChange={(e) => updateSocial({ [key]: e.target.value })}
                className="input-dark text-xs py-1"
                placeholder={placeholder}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Gallery tab ──────────────────────────────────────────────────────────────

function GalleryTab({ tour, items, onUpdate }: { tour: Tour; items: GalleryItem[]; onUpdate: (i: GalleryItem[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const [newUrl,    setNewUrl]    = useState('');
  const [newTitle,  setNewTitle]  = useState('');
  const [newType,   setNewType]   = useState<'image' | 'video'>('image');

  const addItem = () => {
    if (!newUrl.trim()) return;
    const item: GalleryItem = {
      id: Date.now().toString(),
      type: newType,
      url: newUrl.trim(),
      title: newTitle.trim() || undefined,
    };
    onUpdate([...items, item]);
    setNewUrl('');
    setNewTitle('');
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadAsset(tour.id, file);
      const item: GalleryItem = {
        id: Date.now().toString(),
        type: file.type.startsWith('video') ? 'video' : 'image',
        url: result.url,
        title: file.name.replace(/\.[^/.]+$/, ''),
      };
      onUpdate([...items, item]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Upload button */}
      <label className={cn(
        'flex items-center justify-center gap-2 py-2 rounded-xl border-2 border-dashed border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors cursor-pointer text-xs',
        uploading && 'opacity-50 pointer-events-none'
      )}>
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {uploading ? 'Subiendo…' : 'Subir imagen o video'}
        <input type="file" className="hidden" accept="image/*,video/*" onChange={handleUpload} />
      </label>

      {/* Add by URL */}
      <div className="space-y-1.5 bg-gray-800/40 rounded-xl p-2.5">
        <p className="text-[10px] text-gray-500">O agregar por URL</p>
        <div className="flex gap-1">
          {(['image', 'video'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setNewType(t)}
              className={cn(
                'flex-1 py-1 rounded-lg text-[10px] font-medium border transition-colors',
                newType === t
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400'
              )}
            >
              {t === 'image' ? 'Imagen' : 'Video / YouTube'}
            </button>
          ))}
        </div>
        <input type="url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="input-dark text-xs" placeholder="https://…" />
        <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="input-dark text-xs" placeholder="Título (opcional)" />
        <button onClick={addItem} disabled={!newUrl.trim()} className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium disabled:opacity-40 transition-colors flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Agregar
        </button>
      </div>

      {/* Items list */}
      {items.length > 0 && (
        <div className="space-y-1.5">
          {items.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-2 p-2 bg-gray-800/40 rounded-lg group">
              <span className="text-xs">{item.type === 'video' ? '🎬' : '🖼️'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-300 truncate">{item.title ?? `${item.type === 'video' ? 'Video' : 'Imagen'} ${idx + 1}`}</p>
                <p className="text-[10px] text-gray-600 truncate">{item.url}</p>
              </div>
              <button
                onClick={() => onUpdate(items.filter((_, i) => i !== idx))}
                className="p-1 rounded text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Brochure tab ─────────────────────────────────────────────────────────────

function BrochureTab({ tour, updateTour }: { tour: Tour; updateTour: (p: Partial<Omit<Tour, 'id' | 'scenes'>>) => void }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadAsset(tour.id, file);
      updateTour({ brochureUrl: result.url, brochureFilename: file.name });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className={cn(
        'flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors cursor-pointer text-xs',
        uploading && 'opacity-50 pointer-events-none'
      )}>
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {uploading ? 'Subiendo…' : 'Subir brochure (PDF o imagen)'}
        <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleUpload} />
      </label>

      <Field label="O pegar URL del brochure">
        <input
          type="url"
          value={tour.brochureUrl ?? ''}
          onChange={(e) => updateTour({ brochureUrl: e.target.value })}
          className="input-dark"
          placeholder="https://…"
        />
      </Field>

      {tour.brochureUrl && (
        <div className="flex items-center gap-2 p-2 bg-gray-800/50 rounded-xl">
          <FileText className="w-4 h-4 text-blue-400" />
          <p className="text-xs text-gray-300 flex-1 truncate">{tour.brochureFilename ?? 'Brochure'}</p>
          <button
            onClick={() => updateTour({ brochureUrl: undefined, brochureFilename: undefined })}
            className="p-1 text-gray-600 hover:text-red-400 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── POI tab ──────────────────────────────────────────────────────────────────

function POITab({ items, onUpdate }: { items: PointOfInterest[]; onUpdate: (i: PointOfInterest[]) => void }) {
  const [category,    setCategory]    = useState<POICategory>('school');
  const [label,       setLabel]       = useState('');
  const [distance,    setDistance]    = useState('');
  const [description, setDescription] = useState('');

  const addPOI = () => {
    if (!label.trim()) return;
    const poi: PointOfInterest = {
      id: Date.now().toString(),
      label: label.trim(),
      category,
      distance: distance.trim() || undefined,
      description: description.trim() || undefined,
    };
    onUpdate([...items, poi]);
    setLabel('');
    setDistance('');
    setDescription('');
  };

  return (
    <div className="space-y-3">
      {/* Add POI form */}
      <div className="bg-gray-800/40 rounded-xl p-3 space-y-2.5">
        <p className="text-xs font-semibold text-gray-400">Agregar lugar cercano</p>

        {/* Category grid */}
        <div className="grid grid-cols-4 gap-1">
          {POI_CATEGORIES.map(([cat, cfg]) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              title={cfg.label}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[9px] border transition-all',
                category === cat
                  ? 'border-transparent text-white scale-105'
                  : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'
              )}
              style={category === cat ? { background: cfg.color, borderColor: cfg.color } : undefined}
            >
              <span className="text-base leading-none">{cfg.emoji}</span>
              <span className="truncate w-full text-center px-0.5">{cfg.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="input-dark"
          placeholder={`Nombre — ej. ${POI_CONFIG[category].label}`}
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            className="input-dark flex-1"
            placeholder="Distancia — 5 min, 1.2 km"
          />
        </div>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-dark"
          placeholder="Descripción breve (opcional)"
        />
        <button
          onClick={addPOI}
          disabled={!label.trim()}
          className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium disabled:opacity-40 transition-colors flex items-center justify-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Agregar lugar
        </button>
      </div>

      {/* POI list */}
      {items.length > 0 && (
        <div className="space-y-1.5">
          {items.map((poi) => {
            const cfg = POI_CONFIG[poi.category] ?? POI_CONFIG.other;
            return (
              <div key={poi.id} className="flex items-center gap-2 px-2.5 py-2 bg-gray-800/40 rounded-xl group">
                <span className="text-base leading-none">{cfg.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-200 font-medium truncate">{poi.label}</p>
                  {poi.distance && <p className="text-[10px] text-gray-500">{poi.distance}</p>}
                </div>
                <button
                  onClick={() => onUpdate(items.filter((p) => p.id !== poi.id))}
                  className="p-1 rounded text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-400">{label}</label>
      {children}
    </div>
  );
}
