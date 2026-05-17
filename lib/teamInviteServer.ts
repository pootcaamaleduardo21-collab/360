import { createClient, type User } from '@supabase/supabase-js';
import { normalizeAdminPermissions } from './teamPermissions';

function isMissingTeamMembersTable(error: { code?: string; message?: string } | null) {
  return error?.code === '42P01' || error?.message?.includes('team_members');
}

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
    .select('id, admin_id, role, permissions, status')
    .eq('email', email)
    .maybeSingle();

  if (!invite) return { accepted: false };

  const role = invite.role === 'admin' ? 'admin' : 'advisor';
  const permissions = role === 'admin' ? normalizeAdminPermissions(invite.permissions) : [];

  const { error: memberError } = await adminClient
    .from('team_members')
    .upsert({
      owner_user_id: invite.admin_id,
      member_user_id: user.id,
      email,
      role,
      permissions,
      status: 'active',
      revoked_at: null,
    }, {
      onConflict: 'owner_user_id,email',
    });

  if (memberError && !isMissingTeamMembersTable(memberError)) throw memberError;

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
      team_permissions: permissions,
    },
  });

  return { accepted: true, role, adminId: invite.admin_id };
}

export async function revokeTeamAccess(adminId: string, email: string) {
  const adminClient = getServiceRoleClient();
  const targetEmail = email.toLowerCase();

  const { data: invite } = await adminClient
    .from('team_invites')
    .select('advisor_user_id')
    .eq('admin_id', adminId)
    .eq('email', targetEmail)
    .maybeSingle();

  const { data: member, error: memberLookupError } = await adminClient
    .from('team_members')
    .select('member_user_id')
    .eq('owner_user_id', adminId)
    .eq('email', targetEmail)
    .maybeSingle();
  if (memberLookupError && !isMissingTeamMembersTable(memberLookupError)) throw memberLookupError;

  const memberUserId = member?.member_user_id ?? invite?.advisor_user_id ?? null;

  const { error: revokeError } = await adminClient
    .from('team_members')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('owner_user_id', adminId)
    .eq('email', targetEmail);
  if (revokeError && !isMissingTeamMembersTable(revokeError)) throw revokeError;

  await adminClient
    .from('team_invites')
    .delete()
    .eq('admin_id', adminId)
    .eq('email', targetEmail);

  if (memberUserId) {
    const { data: stillActive, error: stillActiveError } = await adminClient
      .from('team_members')
      .select('id')
      .eq('member_user_id', memberUserId)
      .eq('status', 'active')
      .limit(1);
    if (stillActiveError && !isMissingTeamMembersTable(stillActiveError)) throw stillActiveError;

    if (!stillActiveError && !stillActive?.length) {
      const { data: { user } } = await adminClient.auth.admin.getUserById(memberUserId);
      if (user) {
        await adminClient.auth.admin.updateUserById(memberUserId, {
          user_metadata: {
            ...(user.user_metadata ?? {}),
            role: 'advisor',
            invited_by: null,
            team_access_revoked: true,
          },
        });
      }
    }
  }
}
