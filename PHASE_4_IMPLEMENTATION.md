# Phase 4: Implementation Details & Code Examples

Guía técnica con código inicial para implementar cada feature de Phase 4.

## 🎯 Feature 1: Planes & Pricing (Recomendado primero)

### Razón: Es la base para monetización y tiene menor complejidad técnica.

### 1.1 Actualizar Schema SQL

Agregar a `supabase/schema.sql`:

```sql
-- Actualizar tabla profiles con subscription info
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
-- Valores: 'free', 'pro', 'enterprise'

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';
-- Valores: 'inactive', 'active', 'past_due', 'canceled'

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- Tabla de límites por plan
CREATE TABLE IF NOT EXISTS plan_limits (
  tier TEXT PRIMARY KEY,
  max_tours INT,
  max_scenes_per_tour INT,
  max_storage_mb INT,
  price_monthly_usd DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO plan_limits (tier, max_tours, max_scenes_per_tour, max_storage_mb, price_monthly_usd) VALUES
  ('free', 3, 10, 100, 0),
  ('pro', 20, 50, 5000, 29.99),
  ('enterprise', 999, 999, 999999, NULL)
ON CONFLICT (tier) DO NOTHING;

-- Tabla para auditar uso
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric TEXT NOT NULL, -- 'tours_created', 'storage_used', 'api_calls'
  value BIGINT NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON usage_logs(user_id, recorded_at DESC);
```

### 1.2 Crear tipos TypeScript

Archivo: `types/subscription.types.ts`

```typescript
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'inactive' | 'active' | 'past_due' | 'canceled';

export interface PlanLimits {
  tier: SubscriptionTier;
  max_tours: number;
  max_scenes_per_tour: number;
  max_storage_mb: number;
  price_monthly_usd: number | null;
}

export interface UserSubscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  expires_at: string | null;
}

export interface UsageMetrics {
  tours_count: number;
  storage_used_mb: number;
  api_calls_month: number;
}
```

### 1.3 Crear funciones de límites

Archivo: `lib/limits.ts`

```typescript
import { supabase } from '@/lib/supabase';
import { PlanLimits, SubscriptionTier } from '@/types/subscription.types';

// Cache de límites (5 min)
let limitsCache: Record<SubscriptionTier, PlanLimits> | null = null;
let limitsCacheTime = 0;

export async function getPlanLimits(tier: SubscriptionTier): Promise<PlanLimits> {
  // Check cache
  if (limitsCache && Date.now() - limitsCacheTime < 5 * 60 * 1000) {
    return limitsCache[tier];
  }

  const client = supabase.server();
  const { data, error } = await client
    .from('plan_limits')
    .select('*')
    .eq('tier', tier)
    .single();

  if (error || !data) {
    throw new Error(`Failed to fetch limits for tier ${tier}`);
  }

  limitsCache = { ...limitsCache, [tier]: data };
  limitsCacheTime = Date.now();

  return data;
}

export async function getUserUsage(userId: string) {
  const client = supabase.server();

  // Tours count
  const { data: tours } = await client
    .from('tours')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Storage usage (query Supabase Storage API o tabla de metadata)
  const storageUsed = await getStorageUsage(userId);

  return {
    tours_count: tours?.length || 0,
    storage_used_mb: storageUsed,
    api_calls_month: 0, // Implementar tracking si necesario
  };
}

async function getStorageUsage(userId: string): Promise<number> {
  // Implementar: sumar tamaños de archivos en Storage
  // Por ahora, retornar 0 (puede agregarse tracking en upload)
  return 0;
}

export async function checkLimit(
  userId: string,
  tier: SubscriptionTier,
  limitType: 'tours' | 'scenes' | 'storage'
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const usage = await getUserUsage(userId);
  const limits = await getPlanLimits(tier);

  switch (limitType) {
    case 'tours': {
      const allowed = usage.tours_count < limits.max_tours;
      return {
        allowed,
        current: usage.tours_count,
        limit: limits.max_tours,
      };
    }
    case 'scenes':
      // Verificar escenas en tour actual (implementar en validador)
      return { allowed: true, current: 0, limit: limits.max_scenes_per_tour };
    case 'storage': {
      const allowed = usage.storage_used_mb < limits.max_storage_mb;
      return {
        allowed,
        current: usage.storage_used_mb,
        limit: limits.max_storage_mb,
      };
    }
  }
}
```

### 1.4 Integración Stripe (Backend)

Archivo: `lib/stripe.ts`

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) {
  return await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId, // Crear en Stripe Dashboard: monthly/yearly plans
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
  });
}

export async function handleWebhook(event: Stripe.Event) {
  const client = supabase.server();

  switch (event.type) {
    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      // Buscar user_id por stripe_customer_id
      const { data: user } = await client
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (user) {
        const tier = determineTier(subscription.items.data[0]?.price?.id || '');
        const status = subscription.status;

        await client
          .from('profiles')
          .update({
            subscription_tier: tier,
            subscription_status: status,
            subscription_expires_at: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
          })
          .eq('id', user.id);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const { data: user } = await client
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (user) {
        await client
          .from('profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'canceled',
            subscription_expires_at: null,
          })
          .eq('id', user.id);
      }
      break;
    }
  }
}

function determineTier(priceId: string): 'free' | 'pro' | 'enterprise' {
  // Mapear price IDs de Stripe a tiers
  const tierMap: Record<string, 'pro' | 'enterprise'> = {
    'price_pro_monthly': 'pro',
    'price_pro_yearly': 'pro',
    'price_enterprise_monthly': 'enterprise',
  };
  return tierMap[priceId] || 'free';
}
```

### 1.5 API Route para Stripe Webhook

Archivo: `app/api/stripe/webhook/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { handleWebhook } from '@/lib/stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    await handleWebhook(event);
  } catch (error) {
    console.error('Webhook handling error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
```

### 1.6 Pricing Page

Archivo: `app/pricing/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    name: 'Free',
    price: 0,
    description: 'Perfecto para empezar',
    features: [
      '3 tours',
      '10 escenas por tour',
      '100 MB almacenamiento',
      'Hotspots básicos',
      'Visor público',
    ],
    cta: 'Empezar',
    ctaHref: '/auth/register',
  },
  {
    name: 'Pro',
    price: 29.99,
    description: 'Para profesionales',
    features: [
      '20 tours',
      '50 escenas por tour',
      '5 GB almacenamiento',
      'Todos los hotspot types',
      'Analytics básico',
      'QR codes',
      'Soporte por email',
    ],
    cta: 'Upgrade a Pro',
    ctaHref: '/dashboard/upgrade?plan=pro',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: null,
    description: 'Soluciones personalizadas',
    features: [
      'Tours ilimitados',
      'Escenas ilimitadas',
      'Almacenamiento ilimitado',
      'API custom',
      'Analytics avanzado',
      'Soporte prioritario',
      'SLA 99.9%',
      'Deployment dedicado',
    ],
    cta: 'Contactar ventas',
    ctaHref: 'mailto:sales@tour360.com',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-950 py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-white mb-4">
            Precios simples y transparentes
          </h1>
          <p className="text-xl text-gray-400">
            Elige el plan que mejor se adapte a tus necesidades
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'rounded-2xl p-8 border transition-all',
                plan.highlighted
                  ? 'border-blue-500 bg-blue-500/10 scale-105'
                  : 'border-gray-800 bg-gray-900'
              )}
            >
              {plan.highlighted && (
                <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 bg-blue-600 rounded-full text-xs font-semibold text-white">
                  <Zap className="w-3 h-3" /> Más popular
                </div>
              )}

              <h3 className="text-2xl font-bold text-white mb-2">
                {plan.name}
              </h3>
              <p className="text-gray-400 text-sm mb-6">{plan.description}</p>

              <div className="mb-6">
                {plan.price !== null ? (
                  <>
                    <span className="text-4xl font-bold text-white">
                      ${plan.price}
                    </span>
                    <span className="text-gray-400 text-sm">/mes</span>
                  </>
                ) : (
                  <span className="text-2xl text-gray-400">
                    Precio personalizado
                  </span>
                )}
              </div>

              <Link
                href={plan.ctaHref}
                className={cn(
                  'block w-full py-3 rounded-lg font-medium text-center mb-8 transition-colors',
                  plan.highlighted
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                )}
              >
                {plan.cta}
              </Link>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* FAQ o CTA adicional */}
        <div className="mt-20 text-center">
          <p className="text-gray-400 mb-6">
            ¿Preguntas sobre los planes? 
            <Link href="mailto:sales@tour360.com" className="text-blue-400 hover:text-blue-300 ml-2">
              Contacta nuestro equipo de ventas
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
```

### 1.7 Componente de Límites en Editor

Archivo: `components/editor/UsageBar.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UsageBarProps {
  current: number;
  limit: number;
  label: string;
  type: 'tours' | 'storage' | 'api';
}

export function UsageBar({ current, limit, label, type }: UsageBarProps) {
  const percentage = (current / limit) * 100;
  const isWarning = percentage > 80;
  const isLimit = percentage >= 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <span className={cn(
          'text-sm font-semibold',
          isLimit ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-gray-400'
        )}>
          {current} / {limit}
        </span>
      </div>
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all',
            isLimit ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-green-500'
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {isLimit && (
        <div className="flex items-center gap-2 text-xs text-red-400">
          <AlertTriangle className="w-3 h-3" />
          Límite alcanzado. Upgrade a Pro para más.
        </div>
      )}
    </div>
  );
}
```

### 1.8 Middleware para validar límites

Actualizar `app/editor/page.tsx` para mostrar UsageBar:

```typescript
// Dentro del componente EditorInner
import { UsageBar } from '@/components/editor/UsageBar';
import { checkLimit } from '@/lib/limits';
import { useAuth } from '@/hooks/useAuth';

// ... en el componente:
const { user } = useAuth();
const [usage, setUsage] = useState({ tours: 0, storage: 0 });

useEffect(() => {
  if (!user) return;

  checkLimit(user.id, user.subscription_tier || 'free', 'tours').then((result) => {
    setUsage((u) => ({ ...u, tours: result.current }));
  });
}, [user]);

// En JSX (sidebar izquierdo):
<div className="p-3 border-b border-gray-800">
  <UsageBar
    current={usage.tours}
    limit={tour?.sceneCount || 0}
    label="Tours"
    type="tours"
  />
</div>
```

### 1.9 Variables de Entorno Necesarias

```bash
# .env.local (desarrollo)
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# .env.production (producción)
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 1.10 Pasos de Implementación (Orden)

1. ✅ Actualizar schema.sql con tablas de subscription
2. ✅ Crear tipos en `types/subscription.types.ts`
3. ✅ Implementar `lib/limits.ts`
4. ✅ Crear `lib/stripe.ts` y webhook route
5. ✅ Crear `/pricing` page
6. ✅ Agregar `UsageBar` en editor
7. ✅ Crear checkout flow en `/dashboard/upgrade`
8. ✅ Actualizar middleware para validar limits en `/editor`
9. ✅ Sumar storage usage en `lib/storage.ts` al subir archivos
10. ✅ Testear flujo completo: register → upgrade → crear tours → verificar límites

---

## Próximas Features (Después de Pricing)

- **Feature 2: Analytics** — Mismo nivel de complejidad, requiere tracking de eventos
- **Feature 3: WebXR** — Más complejo, requiere investigación de WebXR API
- **Feature 4: i18n** — Nivel bajo de complejidad, pero impacta toda la UI
- **Feature 5: Colaboración** — Nivel medio, requiere RLS dinámico
- **Feature 6: Media Avanzada** — Nivel alto, requiere soporte para múltiples tipos de archivos

---

**Recomendación**: Implementa Pricing primero. Es la base para monetización y tiene ROI rápido. Luego Analytics para entender qué features usan los usuarios.

