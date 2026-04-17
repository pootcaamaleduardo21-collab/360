# Tour360 — Plataforma SaaS de Tours Virtuales 360°

Plataforma web profesional para crear, gestionar y compartir tours virtuales 360° interactivos para Real Estate y arquitectura. Construida con **Next.js 14**, **Three.js**, **Supabase** y **Tailwind CSS**.

## 🎯 Características Principales

### ✅ Fase 1-3 Completadas

- **Editor 360° Interactivo**: Carga imágenes equirectangulares, coloca hotspots (navegación, info, media, agente, producto)
- **Three.js WebGL Viewer**: Renderizado de esferas de alta calidad con raycasting y controles drag
- **Hotspot Management**: 5 tipos de hotspots con modales editables y navegación por escenas
- **Supabase Storage**: Persistencia de imágenes en buckets con validación 2:1 ratio
- **Nadir Patch**: Canvas API con gradientes radiales para logos en posición nadir
- **Color Filters**: Ajustes de brillo, contraste, saturación aplicados en tiempo real
- **Autenticación**: Supabase Auth con email/password, session persistence, SSR middleware
- **Dashboard**: Vista de tours del usuario con estadísticas de vistas, acciones de edición
- **Inventario Inmobiliario**: Gestión de unidades (disponible, vendido, reservado) con precios y áreas
- **Carrito de Cotización**: Panel flotante para agregar productos con resumen de precios
- **Sistema de Publicación**: URL públicas customizables con slugs, QR codes, iframe embebibles
- **Docker & CI/CD**: Multi-stage build, GitHub Actions, push automático a ghcr.io

## 🛠 Tech Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router), React, Tailwind CSS |
| 3D/WebGL | Three.js, raycasting, esfera invertida |
| Estado | Zustand (persist middleware) |
| Backend | Supabase (PostgreSQL, Auth, Storage, RLS) |
| UI Components | Lucide React, custom modals y paneles |
| Validación | TypeScript, Zod (cuando aplica) |
| Deploy | Docker, GitHub Actions, ghcr.io |

## 📦 Instalación Local

### Requisitos
- Node.js 18+ y npm/pnpm
- Cuenta Supabase (opcional para desarrollo local)
- Docker (para CI/CD local)

### Setup

```bash
# 1. Clonar repositorio
git clone https://github.com/pootcaamaleduardo21-collab/360.git
cd 360

# 2. Instalar dependencias
npm install

# 3. Variables de entorno
cp .env.local.example .env.local
# Completar con Supabase keys (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
# Opcional: NEXT_PUBLIC_APP_URL para verificaciones de origen

# 4. Ejecutar schema SQL (una sola vez)
# Ir a Supabase Dashboard → SQL Editor → correr supabase/schema.sql
# Esto crea tablas, triggers, funciones y RLS policies

# 5. Iniciar servidor local
npm run dev
# Acceder a http://localhost:3000
```

### Variables de Entorno

```env
# Supabase (PUBLIC - safe to expose)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Opcional
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Server-only (no expongas estas)
# (Usa service role key si necesitas operaciones de admin server-side)
```

## 🗂 Estructura de Carpetas

```
app/
├── page.tsx                    # Landing page
├── editor/
│   └── page.tsx              # Editor completo (3 columnas)
├── viewer/[tourId]/
│   └── page.tsx              # Visor público embebible
├── dashboard/
│   └── page.tsx              # Dashboard de tours del usuario
├── auth/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── callback/route.ts     # Supabase auth code exchange
└── api/
    └── [...path]/route.ts    # Fallback para rutas no encontradas

components/
├── viewer/
│   ├── Viewer360.tsx         # Componente principal con Three.js
│   ├── HotspotMarker.tsx     # Marcadores DOM-based
│   ├── HotspotModal.tsx      # Modales para 5 tipos de hotspots
│   ├── MinimapWidget.tsx     # Mapa de escenas
│   ├── TutorialOverlay.tsx   # Tutorial interactivo
│   ├── CartPanel.tsx         # Carrito flotante
│   └── InventoryOverlay.tsx  # Panel de inventario inmobiliario
├── editor/
│   ├── ImageUploader.tsx     # Drag-drop con validación 2:1
│   ├── HotspotPanel.tsx      # Editor de propiedades de hotspot
│   ├── SceneManager.tsx      # Lista y reordenamiento de escenas
│   ├── RetouchPanel.tsx      # Ajustes de color y nadir patch
│   ├── InventoryPanel.tsx    # Gestión de unidades
│   └── EmbedPanel.tsx        # Publicación y QR codes
├── dashboard/
│   └── TourCard.tsx          # Tarjeta de tour con acciones
└── auth/
    └── AuthForm.tsx          # Formulario compartido login/register

hooks/
├── useAuth.ts               # Authentication state management
├── useViewer360.ts          # Three.js initialization y control
├── useColorFilter.ts        # CSS filter application
└── useTourStore.ts          # (alias a store/tourStore)

lib/
├── supabase.ts              # Lazy Supabase client (browser + server)
├── db.ts                    # Database CRUD operations
├── storage.ts               # File upload/download helpers
├── nadirPatch.ts            # Canvas API para nadir logo
├── colorFilter.ts           # CSS filter utilities
└── utils.ts                 # Helpers generales

store/
└── tourStore.ts             # Zustand store (editor + viewer + cart)

types/
└── tour.types.ts            # Tipos centrales (Tour, Scene, Hotspot, etc)

supabase/
└── schema.sql              # Schema SQL con RLS policies

middleware.ts               # Route protection y auth refresh

.github/workflows/
└── docker.yml             # CI/CD: type-check, build, push to ghcr.io

Dockerfile                 # Multi-stage, Alpine Node 20, non-root user
docker-compose.yml         # Local Docker Compose para testing
```

## 🚀 Flujos Principales

### Crear un Tour
1. **Registrarse/Login** → `/auth/register` o `/auth/login`
2. **Editor** → `/editor` (nuevo tour vacío) o `/editor?id=uuid` (editar existente)
3. **Subir Imágenes** → Tab "Subir", drag-drop de equirectangulares 2:1 (ej: 8000×4000)
4. **Agregar Hotspots** → Seleccionar tipo (Navegar/Info/Media/Agente/Producto) → click en visor
5. **Editar Propiedades** → Sidebar derecho "Hotspot" para configurar campos específicos
6. **Publicar** → Tab "Publicar", toggle "Publicado", copiar URL pública o QR code
7. **Ver Tours** → `/dashboard` (solo tours propios)

### Ver un Tour
- **URL pública**: `/viewer/[slug-o-uuid]`
- **Embebible**: `<iframe src="/viewer/[slug]" width="100%" height="600"></iframe>`
- **Controles**: Mouse drag para rotar, scroll para zoom, click en hotspots para interactuar
- **Inventario**: Si tour tiene unidades (real estate), panel superior izquierdo listaba con status

### Gestionar Inventario
1. **Editor** → Tab "Inventario"
2. **Agregar/editar unidades**: Label, área, precio, estado (disponible/vendido/reservado)
3. **Vincular a escenas**: Cada unidad puede apuntar a una escena específica
4. **Ver en público**: Panel flotante en `/viewer/[tourId]` con filtro de status

## 🔐 Seguridad & RLS

Supabase RLS policies:
- **Usuarios propios**: Acceso total a tours, escenas, hotspots, unidades
- **Tours publicados**: Lectura pública (sin autenticación) en visor
- **Archivos Storage**: Acceso por propietario + lectura pública si tour publicado
- **Vistas**: Función `increment_views()` ejecuta como service role (trusted)

## 🐳 Docker & CI/CD

### Local Build
```bash
docker build --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  -t tour360:latest .

docker run -p 3000:3000 tour360:latest
```

### GitHub Actions
- **Trigger**: Push a `main` o tags `v*`
- **Steps**: 
  1. Type-check (`tsc --noEmit`)
  2. Build Docker image
  3. Push a `ghcr.io/pootcaamaleduardo21-collab/360:latest` (requiere secrets)
  
**Secrets requeridos** en GitHub:
```
REGISTRY_USERNAME = (GitHub username)
REGISTRY_PASSWORD = (PAT con scope docker:read,write)
```

## 📋 Roadmap (Fase 4+)

- [ ] **Planes & Pricing**: Modelos free vs pro con límites de tours/escenas/storage
- [ ] **Analytics**: Dashboard de vistas por escena, mapa de calor de hotspots, conversiones
- [ ] **WebXR Support**: Modo VR con immersive-vr sessions, hand controllers
- [ ] **Internacionalización (i18n)**: Soporte para ES, EN, PT con next-intl
- [ ] **Mejoras UX**: Reordenamiento de escenas drag-drop, vista previa en grid, temas personalizables
- [ ] **Colaboración**: Compartir tours con permisos (edit/view), comentarios en hotspots
- [ ] **Advanced Media**: Soporte para 360° videos, audios puntuales, PDFs, galerías embebidas
- [ ] **Métricas**: Lead capture forms, tracking de conversiones, integraciones CRM (Pipedrive, etc)

## 💡 Notas de Desarrollo

### Características Principales del Código
- **Componentes dinámicos**: `Viewer360` usa `dynamic()` sin SSR (Three.js is browser-only)
- **Estado con Persist**: Zustand store guarda tours en localStorage como fallback
- **Server Components**: `getTourById()`, `getTourBySlug()` son server functions cuando es posible
- **Validaciones**: 2:1 ratio en ImageUploader, email único en auth, slug único en publicación
- **Error Handling**: Try-catch en cargas de DB/Storage, fallbacks a local state cuando Supabase no está configurado

### Desarrollo Sin Supabase
Si ejecutas sin configurar Supabase:
- Tours guardados en localStorage solo (no persisten entre browsers)
- Auth deshabilitada (acceso directo a `/editor` sin login)
- `/viewer/[tourId]` busca tour en store local
- Perfecto para prototipado local, pero **no** para producción

### Convenciones
- Nombres de funciones en español (editScena, agregarHotspot) excepto tipos TypeScript
- Componentes con `'use client'` al inicio para Client Components
- Hooks con `useAuth()`, `useViewer360()`, selectors con `selectCurrentScene()`
- Colores Tailwind: blue-600 para primaria, gray-950 para fondo oscuro
- Todos los componentes son responsive mobile-first

## 📚 Documentación Adicional

- **Schema SQL**: Ver `supabase/schema.sql` para estructura de base de datos
- **Types**: Ver `types/tour.types.ts` para interfaces de dominio
- **Zustand Store**: Ver `store/tourStore.ts` para state management
- **Supabase Client**: Ver `lib/supabase.ts` para patrón de inicialización

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit con prefix (feat:, fix:, docs:, etc)
4. Push y abre Pull Request

## 📄 Licencia

MIT — Libre para uso comercial

---

**Última actualización**: Abril 2026  
**Status**: Fase 3 completa (Auth + DB + Inventario + Publicación)  
**Mantenedor**: Eduardo Caámale
