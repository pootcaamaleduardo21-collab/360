import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';

const BUCKET = 'advisor-avatars';
const MAX_SIZE = 5 * 1024 * 1024;
const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(request: NextRequest) {
  try {
    const sb = createSupabaseServerClient(cookies());
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const form = await request.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Selecciona una imagen.' }, { status: 400 });
    if (!VALID_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Usa una imagen JPG, PNG o WEBP.' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'La imagen no puede superar 5 MB.' }, { status: 400 });
    }

    const admin = getServiceRoleClient();
    await admin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_SIZE,
      allowedMimeTypes: VALID_TYPES,
    }).catch(() => {});

    const ext = file.name.includes('.') ? file.name.split('.').pop() : file.type.split('/')[1];
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: publicData } = admin.storage.from(BUCKET).getPublicUrl(path);
    const photoUrl = publicData.publicUrl;

    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...(user.user_metadata ?? {}),
        avatar_url: photoUrl,
        photo_url: photoUrl,
      },
    });

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    return NextResponse.json({ photoUrl });
  } catch (err) {
    console.error('[POST /api/advisor/photo]', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
