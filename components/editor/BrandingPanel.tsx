'use client';

import { useState, useCallback, useRef } from 'react';
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
  Plus, Trash2, Upload, Loader2, Link, X, Search,
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
        <POITab tour={tour} items={tour.pointsOfInterest ?? []} onUpdate={updatePOIs} />
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

      <Field label="Logo de la empresa">
        <LogoUpload tour={tour} updateTour={updateTour} />
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

      {/* Property location — used as origin for POI distance calculation */}
      <div className="border-t border-gray-800 pt-3 space-y-2">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="w-3 h-3" /> Ubicación del desarrollo
        </p>
        <p className="text-[10px] text-gray-600 leading-snug">
          Busca la dirección del desarrollo. Se usa para calcular distancias de los puntos de interés.
        </p>
        <LocationPicker
          lat={tour.propertyLat}
          lng={tour.propertyLng}
          onChange={(lat, lng) => updateTour({ propertyLat: lat, propertyLng: lng })}
        />
      </div>
    </div>
  );
}

// ─── Logo upload ─────────────────────────────────────────────────────────────

function LogoUpload({
  tour,
  updateTour,
}: {
  tour: Tour;
  updateTour: (p: Partial<Omit<Tour, 'id' | 'scenes'>>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Sólo se permiten imágenes (PNG, JPG, SVG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('El archivo no puede superar 5 MB.');
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const result = await uploadAsset(tour.id, file);
      updateTour({ logoUrl: result.url });
    } catch {
      setUploadError('Error al subir el logo. Inténtalo de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {/* Preview / placeholder */}
        {tour.logoUrl ? (
          <div className="relative group flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tour.logoUrl}
              alt="Logo"
              className="w-16 h-16 rounded-xl object-contain bg-white/5 border border-gray-700 p-1.5"
            />
            <button
              onClick={() => updateTour({ logoUrl: '' })}
              title="Quitar logo"
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 border border-gray-600 rounded-full flex items-center justify-center text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-600 flex-shrink-0">
            <Upload className="w-5 h-5" />
          </div>
        )}

        {/* Upload button */}
        <div className="flex-1 space-y-1.5">
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs font-medium text-gray-300 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Subiendo…</>
            ) : (
              <><Upload className="w-3.5 h-3.5" /> {tour.logoUrl ? 'Cambiar logo' : 'Subir logo'}</>
            )}
          </button>
          <p className="text-[10px] text-gray-600 text-center">PNG, JPG, SVG, WebP · máx. 5 MB</p>
        </div>
      </div>

      {uploadError && (
        <p className="text-[11px] text-red-400">{uploadError}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
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

interface PlaceSuggestion {
  placeId:       string;
  description:   string;
  mainText:      string;
  secondaryText: string;
}

function POITab({ tour, items, onUpdate }: { tour: Tour; items: PointOfInterest[]; onUpdate: (i: PointOfInterest[]) => void }) {
  const [category,    setCategory]    = useState<POICategory>('school');
  const [label,       setLabel]       = useState('');
  const [distance,    setDistance]    = useState('');
  const [description, setDescription] = useState('');
  const [address,     setAddress]     = useState('');
  const [lat,         setLat]         = useState<number | undefined>();
  const [lng,         setLng]         = useState<number | undefined>();
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching,   setSearching]   = useState(false);
  const [resolving,   setResolving]   = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Session token groups autocomplete + details into one billing session
  const sessionRef  = useRef(crypto.randomUUID());

  const hasOrigin = tour.propertyLat != null && tour.propertyLng != null;

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(value)}&sessiontoken=${sessionRef.current}`);
        if (res.ok) setSuggestions(await res.json());
      } finally {
        setSearching(false);
      }
    }, 350);
  }, []);

  const pickSuggestion = useCallback(async (s: PlaceSuggestion) => {
    setSuggestions([]);
    setQuery('');
    setResolving(true);
    try {
      const res = await fetch(`/api/places/${s.placeId}?sessiontoken=${sessionRef.current}`);
      sessionRef.current = crypto.randomUUID(); // new session after details call
      if (!res.ok) { setAddress(s.description); return; }
      const { lat: pLat, lng: pLng, formattedAddress, name } = await res.json();
      const km = (hasOrigin && pLat != null && pLng != null)
        ? haversineKm(tour.propertyLat!, tour.propertyLng!, pLat, pLng)
        : null;
      setLat(pLat ?? undefined);
      setLng(pLng ?? undefined);
      setAddress(formattedAddress || s.description);
      if (km != null) setDistance(`${formatDriveTime(km)} · ${formatDistance(km)}`);
      setLabel((cur) => cur || name || s.mainText);
    } finally {
      setResolving(false);
    }
  }, [hasOrigin, tour.propertyLat, tour.propertyLng]);

  const addPOI = () => {
    if (!label.trim()) return;
    const poi: PointOfInterest = {
      id: Date.now().toString(),
      label: label.trim(),
      category,
      distance: distance.trim() || undefined,
      description: description.trim() || undefined,
      address: address.trim() || undefined,
      lat,
      lng,
    };
    onUpdate([...items, poi]);
    setLabel('');
    setDistance('');
    setDescription('');
    setAddress('');
    setLat(undefined);
    setLng(undefined);
    setQuery('');
    setSuggestions([]);
  };

  return (
    <div className="space-y-3">
      {/* Add POI form */}
      <div className="bg-gray-800/40 rounded-xl p-3 space-y-2.5">
        <p className="text-xs font-semibold text-gray-400">Agregar lugar cercano</p>
        {!hasOrigin && (
          <p className="text-[10px] text-amber-500/80 leading-snug">
            Configura primero la ubicación del desarrollo en Marca para calcular distancias automáticamente.
          </p>
        )}

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
        {/* Google Places autocomplete */}
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="input-dark pl-8 pr-8"
              placeholder="Buscar con Google Maps…"
              autoComplete="off"
            />
            {(searching || resolving) && (
              <Loader2 className="absolute right-2.5 w-3.5 h-3.5 text-blue-400 animate-spin" />
            )}
          </div>
          {suggestions.length > 0 && (
            <div className="absolute z-50 top-full mt-1 w-full bg-gray-800 border border-gray-600 rounded-xl shadow-2xl overflow-hidden">
              {suggestions.map((s) => (
                <button
                  key={s.placeId}
                  type="button"
                  onClick={() => pickSuggestion(s)}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-700 border-b border-gray-700/60 last:border-0 transition-colors"
                >
                  <p className="text-xs font-medium text-gray-200 leading-snug">{s.mainText}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">{s.secondaryText}</p>
                </button>
              ))}
              <div className="flex items-center justify-end gap-1 px-3 py-1.5 bg-gray-900/60 border-t border-gray-700/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-non-white3.png" alt="Powered by Google" className="h-3 opacity-60" />
              </div>
            </div>
          )}
        </div>

        {/* Map preview — Google Maps Static API */}
        {lat != null && lng != null && (
          <div className="rounded-xl overflow-hidden border border-gray-700 relative" style={{ height: 130 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=320x130&scale=2&markers=color:red%7C${lat},${lng}&style=feature:all|element:labels.text.fill|color:0x9ca3af&style=feature:poi|visibility:simplified&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`}
              alt="Vista previa del lugar"
              className="w-full h-full object-cover"
            />
            {address && (
              <div className="absolute bottom-0 left-0 right-0 px-2.5 py-1.5 bg-gray-950/80 backdrop-blur-sm">
                <p className="text-[10px] text-gray-300 truncate">{address}</p>
              </div>
            )}
          </div>
        )}

        <input
          type="text"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          className="input-dark"
          placeholder="Distancia — ej. 5 min · 2.3 km (se calcula automáticamente)"
        />
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
                  {(poi.distance || poi.address) && (
                    <p className="text-[10px] text-gray-500 truncate">{[poi.distance, poi.address].filter(Boolean).join(' · ')}</p>
                  )}
                </div>
                {(poi.lat != null && poi.lng != null) && (
                  <a
                    href={`https://www.google.com/maps?q=${poi.lat},${poi.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded text-gray-600 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Ver en Google Maps"
                  >
                    <MapPin className="w-3 h-3" />
                  </a>
                )}
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

// ─── LocationPicker ───────────────────────────────────────────────────────────

function LocationPicker({
  lat, lng, onChange,
}: {
  lat?: number;
  lng?: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching,   setSearching]   = useState(false);
  const [resolving,   setResolving]   = useState(false);
  const [placeName,   setPlaceName]   = useState<string | null>(null);
  const [editing,     setEditing]     = useState(!lat || !lng);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef   = useRef(crypto.randomUUID());

  const hasPin = lat != null && lng != null;

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(value)}&sessiontoken=${sessionRef.current}`);
        if (res.ok) setSuggestions(await res.json());
      } finally {
        setSearching(false);
      }
    }, 350);
  }, []);

  const pick = useCallback(async (s: PlaceSuggestion) => {
    setSuggestions([]);
    setQuery('');
    setResolving(true);
    try {
      const res = await fetch(`/api/places/${s.placeId}?sessiontoken=${sessionRef.current}`);
      sessionRef.current = crypto.randomUUID();
      if (!res.ok) return;
      const { lat: pLat, lng: pLng, name, formattedAddress } = await res.json();
      if (pLat != null && pLng != null) {
        onChange(pLat, pLng);
        setPlaceName(name || formattedAddress || s.mainText);
        setEditing(false);
      }
    } finally {
      setResolving(false);
    }
  }, [onChange]);

  // ── Confirmed view ──────────────────────────────────────────────────────────
  if (hasPin && !editing) {
    const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40">
          <div className="w-8 h-8 rounded-full bg-emerald-700/25 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-emerald-300 leading-snug line-clamp-2">
              {placeName ?? 'Ubicación guardada'}
            </p>
            <button
              onClick={() => { setEditing(true); setSuggestions([]); }}
              className="text-[10px] text-gray-500 hover:text-gray-300 mt-0.5 transition-colors"
            >
              Cambiar ubicación
            </button>
          </div>
          <a
            href={`https://www.google.com/maps?q=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 px-2.5 py-1 text-[11px] font-medium bg-blue-600/20 border border-blue-600/30 text-blue-400 rounded-lg hover:bg-blue-600/35 transition-colors"
          >
            Ver ↗
          </a>
        </div>

        {/* Google Maps Static preview */}
        <div className="rounded-xl overflow-hidden border border-gray-700/60" style={{ height: 170 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=320x170&scale=2&markers=color:red%7C${lat},${lng}&style=feature:poi|visibility:simplified&key=${MAPS_KEY}`}
            alt="Ubicación del desarrollo"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    );
  }

  // ── Search mode ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Ej: Torre Mayor, Playa del Carmen, Col. Polanco…"
            className="input-dark text-xs pl-8 pr-8"
            autoComplete="off"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus={editing && hasPin}
          />
          {(searching || resolving) && (
            <Loader2 className="absolute right-2.5 w-3.5 h-3.5 text-blue-400 animate-spin" />
          )}
        </div>
        {suggestions.length > 0 && (
          <div className="absolute z-50 top-full mt-1 w-full bg-gray-800 border border-gray-600 rounded-xl shadow-2xl overflow-hidden">
            {suggestions.map((s) => (
              <button
                key={s.placeId}
                type="button"
                onClick={() => pick(s)}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-700 border-b border-gray-700/60 last:border-0 transition-colors flex items-start gap-2"
              >
                <MapPin className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-200 leading-snug">{s.mainText}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">{s.secondaryText}</p>
                </div>
              </button>
            ))}
            <div className="flex items-center justify-end px-3 py-1.5 bg-gray-900/60 border-t border-gray-700/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-non-white3.png" alt="Powered by Google" className="h-3 opacity-60" />
            </div>
          </div>
        )}
      </div>

      {hasPin && (
        <button
          onClick={() => setEditing(false)}
          className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
        >
          ← Cancelar
        </button>
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

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function formatDriveTime(km: number): string {
  const min = Math.max(1, Math.round((km / 28) * 60));
  if (min < 60) return `${min} min en auto`;
  return `${Math.floor(min / 60)}h ${min % 60}min en auto`;
}

