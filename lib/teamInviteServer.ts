import { createClient, type User } from '@supabase/supabase-js';

export function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function buildInviteUrl(appUrl: string, email: string) {
  const url = new URL('/auth/register', appUrl);
  url.searchParams.set('email', email.toLowerCase());
  return url.toString();
}

export async function findAuthUserByEmail(email: string) {
  const adminClient = getServiceRoleClient();
  const targetEmail = email.toLowerCase();

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw error;

    const user = data.users.find((item) => item.email?.toLowerCase() === targetEmail);
    if (user) return user;
    if (data.users.length < 100) break;
  }

  return null;
}

export async function acceptPendingInviteForUser(user: User) {
  const email = user.email?.toLowerCase();
  if (!email) return { accepted: false };

  const adminClient = getServiceRoleClient();
  const { data: invite } = await adminClient
    .from('team_invites')
    .select('id, admin_id, role, status')
    .eq('email', email)
    .maybeSingle();

  if (!invite) return { accepted: false };

  const role = invite.role === 'admin' ? 'admin' : 'advisor';

  await adminClient
    .from('team_invites')
    .update({
      status: 'accepted',
      advisor_user_id: user.id,
    })
    .eq('id', invite.id);

  await adminClient.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...(user.user_metadata ?? {}),
      role,
      invited_by: invite.admin_id,
    },
  });

  return { accepted: true, role, adminId: invite.admin_id };
}
