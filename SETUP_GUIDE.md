# Tour360 — Setup & Deployment Guide

Guía completa para configurar Supabase, GitHub Actions CI/CD, y fases de desarrollo futuro.

## 🔧 1. Configurar Supabase

### 1.1 Crear Proyecto Supabase

1. Ir a [supabase.com](https://supabase.com) → Sign Up
2. Crear nuevo proyecto (mismo nombre recomendado: "tour360")
3. Anotar:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon Key**: Encontrar en Settings → API → Project API Keys
   - **Service Role Key**: (para operaciones server-side, solo en .env.local)

### 1.2 Ejecutar Schema SQL

1. En Supabase Dashboard → SQL Editor → New Query
2. Copiar contenido de `supabase/schema.sql` local
3. Pegar en el editor y ejecutar ▶️
4. Verificar que se crearon:
   - Tabla `profiles` (auto-generada por trigger auth.users)
   - Tabla `tours` (con JSONB column `data`)
   - Tabla `tour_views` (para analytics)
   - Funciones RLS y `increment_views()`

### 1.3 Configurar Storage Buckets

1. Supabase Dashboard → Storage → New Bucket
   - Nombre: `scenes` (imágenes 360°)
   - Privacy: Private
   - ✅ Habilitar: File size limit (50MB)

2. Crear segundo bucket:
   - Nombre: `assets` (logos, thumbnails, etc)
   - Privacy: Public
   - ✅ Habilitar: File size limit (10MB)

3. Cada bucket necesita RLS policies (ver schema.sql):
   - Owners pueden subir/leer/borrar
   - Tours publicados pueden ser leídos públicamente

## 🚀 2. Configurar GitHub Actions CI/CD

### 2.1 Agregar Secrets a GitHub

En el repositorio GitHub → Settings → Secrets and variables → Actions → New repository secret

Crear **tres secrets**:

| Secret | Valor | Nota |
|--------|-------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | De Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` | Del mismo lugar (Project API Keys) |
| `NEXT_PUBLIC_APP_URL` | `https://tour360.youromain.com` | Dominio final (puedes usar localhost:3000 al inicio) |

> **⚠️ IMPORTANTE**: Los secrets con `NEXT_PUBLIC_` se insertan en el build y son públicos (seguros exponer). El `SERVICE_ROLE_KEY` NUNCA va como secret público.

### 2.2 Verificar Flujo CI/CD

1. Push a `main` debe disparar workflow:
   ```bash
   git add .
   git commit -m "test: trigger CI"
   git push origin main
   ```

2. Ir a GitHub → Actions → Ver ejecución
3. Si todo OK: ✅ Type-check → ✅ Docker build → ✅ Push a ghcr.io

4. Imagen generada: `ghcr.io/pootcaamaleduardo21-collab/360:latest`

### 2.3 Usar Imagen Docker en Producción

```bash
# Pull desde ghcr.io
docker pull ghcr.io/pootcaamaleduardo21-collab/360:latest

# Ejecutar
docker run -p 80:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... \
  ghcr.io/pootcaamaleduardo21-collab/360:latest
```

O con Docker Compose:

```yaml
version: '3.8'
services:
  app:
    image: ghcr.io/pootcaamaleduardo21-collab/360:latest
    ports:
      - "80:3000"
    environment:
      NEXT_PUBLIC_SUPABASE_URL: https://xxxxx.supabase.co
      NEXT_PUBLIC_SUPABASE_ANON_KEY: eyJhbGc...
```

## 📦 3. Desplegar en Producción

### Opción A: Vercel (Recomendado para Next.js)

1. Ir a [vercel.com](https://vercel.com) → Sign up con GitHub
2. Importar repositorio `360`
3. Agregar Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` = URL de Vercel
4. Deploy automático en cada push a `main`

### Opción B: Docker en VPS/Cloud Run

**Google Cloud Run** (simple, sin servidor):
```bash
# Desde raíz del proyecto
gcloud run deploy tour360 \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_SUPABASE_URL=...,NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

**AWS ECS** o **DigitalOcean App Platform**: Usar GitHub Actions para push automático a ECR/Docker Registry.

### Opción C: VPS Manual (Docker)

1. SSH a VPS (Ubuntu 22.04+)
2. Instalar Docker & Docker Compose
3. Crear `.env` en `/home/app/tour360/.env.production`
4. Usar docker-compose.yml para orquestación
5. Nginx reverse proxy en puerto 80/443 → 3000

## 📋 Fase 4: Roadmap de Desarrollo

### Feature 1: Planes & Pricing (1-2 semanas)

**Objetivo**: Modelos freemium con límites y pagos Stripe.

**Implementar**:
- [ ] Schema SQL: columnas `subscription_tier` (free/pro/enterprise) en `profiles`
- [ ] Stripe integration: crear `stripe/` folder con `webhook.ts`, `intent.ts`
- [ ] Pricing page: `/pricing` con comparativa de planes
- [ ] Límites por plan:
  - **Free**: 3 tours, 10 escenas/tour, 100MB storage
  - **Pro**: 20 tours, 50 escenas/tour, 5GB storage
  - **Enterprise**: Ilimitado, soporte prioritario
- [ ] Middleware: validar límites en `/editor` y `/api/upload`
- [ ] Dashboard: mostrar uso actual vs límites

**Archivos nuevos**:
```
lib/stripe.ts
lib/limits.ts (validar subscription limits)
app/pricing/page.tsx
app/api/stripe/webhook/route.ts
components/billing/PlanSelector.tsx
components/billing/UsageBar.tsx
```

### Feature 2: Analytics Dashboard (1-2 semanas)

**Objetivo**: Métricas de vistas, hotspots más clickeados, conversiones.

**Implementar**:
- [ ] Schema: tabla `hotspot_events` (tour_id, hotspot_id, event_type, timestamp)
- [ ] Cliente: enviar eventos al hacer click en hotspots
- [ ] API: endpoint `/api/analytics/events` para guardar (validar owner)
- [ ] Dashboard: `/dashboard/[tourId]/analytics`
  - Gráfico: vistas por día (últimos 30 días)
  - Heatmap: hotspots más clickeados
  - Conversiones: cart checkouts vs vistas
- [ ] RLS: Solo propietario puede ver analíticas propias

**Archivos nuevos**:
```
lib/analytics.ts (track events)
app/dashboard/[tourId]/analytics/page.tsx
components/analytics/ViewsChart.tsx
components/analytics/HotspotHeatmap.tsx
components/analytics/ConversionFunnel.tsx
```

### Feature 3: WebXR (VR Mode) (2-3 semanas)

**Objetivo**: Experiencia VR con Meta Quest, HTC Vive, etc.

**Implementar**:
- [ ] Usar WebXR Device API + Three.js XR mode
- [ ] Botón "Enter VR" en visor (solo disponible si browser soporta)
- [ ] Handtracking para manipular hotspots
- [ ] Controller inputs: grip para rotar, trigger para click
- [ ] Fallback a 360° normal si no hay dispositivo VR

**Archivos nuevos**:
```
lib/webxr.ts (setup XR session)
hooks/useXRMode.ts (state management)
components/viewer/XRButton.tsx
components/viewer/XRController.tsx (hand tracking visualization)
```

**Dependencias**:
```json
{
  "@react-three/xr": "^5.0.0",
  "three": "^r159"
}
```

### Feature 4: Internacionalización i18n (1-2 semanas)

**Objetivo**: Soporte ES, EN, PT en UI y contenido de tours.

**Implementar**:
- [ ] `next-intl` middleware + routing dinámico (`/es/editor`, `/en/viewer`, etc)
- [ ] JSON con traducciones: `messages/es.json`, `messages/en.json`, etc
- [ ] UI strings traducidas: "Hotspot" → "Punto Interactivo" (ES), "Interactive Point" (EN)
- [ ] Selector de idioma en footer
- [ ] Persistir idioma en localStorage

**Archivos nuevos**:
```
i18n.config.ts (next-intl config)
middleware.ts (actualizar con i18n logic)
messages/
  ├── es.json (todas las strings)
  ├── en.json
  └── pt.json
hooks/useTranslation.ts
components/LanguageSwitcher.tsx
app/[locale]/editor/page.tsx (actualizar todas las rutas)
```

### Feature 5: Colaboración Compartida (1-2 semanas)

**Objetivo**: Compartir tours con otros usuarios (edit/view).

**Implementar**:
- [ ] Schema: tabla `tour_collaborators` (tour_id, user_id, role)
- [ ] Permisos: owner, editor, viewer
- [ ] Modal "Compartir Tour" en editor
- [ ] Validar acceso: middleware check `collaborators` table
- [ ] Real-time updates: WebSockets o Supabase Realtime

**Archivos nuevos**:
```
lib/collaboration.ts (check permissions)
app/api/tours/[tourId]/collaborators/route.ts
components/editor/ShareModal.tsx
components/editor/CollaboratorsList.tsx
```

### Feature 6: Media Avanzada (2 semanas)

**Objetivo**: Soportar videos 360°, audios, PDFs, galerías.

**Implementar**:
- [ ] Scene type: `image` (actual) vs `video360` (nuevo)
- [ ] HLS streaming para videos grandes (usar `hls.js`)
- [ ] Hotspot type: `audio-point` (sonido directional)
- [ ] Hotspot type: `pdf-viewer` (embeber PDF)
- [ ] Hotspot type: `gallery` (carrusel de imágenes)
- [ ] VideoUploader component (validar H.264, H.265)

**Dependencias**:
```json
{
  "hls.js": "^1.4.0",
  "pdfjs-dist": "^4.0.0"
}
```

## 🔄 Workflow de Desarrollo

### Para cada feature:

1. **Rama de feature**: `git checkout -b feature/nombre`
2. **Desarrollo local**: Pruebas en http://localhost:3000
3. **Commit iterativo**: `git commit -m "feat: ..."`
4. **Push a rama**: `git push origin feature/nombre`
5. **Pull Request**: En GitHub, con descripción detallada
6. **Code review**: (si trabajas en equipo)
7. **Merge a main**: Triggea CI/CD automático
8. **Monitoreo**: Vercel/Cloud Run deployment automático

## 🐛 Debugging & Troubleshooting

### Supabase Auth no funciona
```bash
# Verificar NEXT_PUBLIC_SUPABASE_URL y ANON_KEY en .env.local
# Revisar Supabase Dashboard → Auth → Settings → Site URL
```

### Docker build falla
```bash
# Asegurar que build args se pasan:
docker build --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... .
```

### GitHub Actions no pushea imagen
1. Verificar secrets están configurados
2. Ver logs en Actions → job "Docker build & push"
3. Confirmar token tiene permisos `packages:write`

## 📊 Monitoreo en Producción

### Logs
- **Vercel**: Dashboard → Logs
- **Cloud Run**: `gcloud run logs read tour360 --limit 50`
- **VPS**: `docker logs <container-id>`

### Métricas
- **Supabase**: Dashboard → Monitoring → Database stats, API usage
- **Stripe**: Dashboard → Metrics (revenue, transactions)
- **Google Analytics**: Integrar en página (opcionalmente)

---

**Próximo Paso**: Elige Feature 1 (Pricing) o Feature 2 (Analytics) según prioridad.

