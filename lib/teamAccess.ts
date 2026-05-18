import type { SupabaseClient, User } from '@supabase/supabase-js';
import { acceptPendingInviteForUser, getServiceRoleClient } from './teamInviteServer';

type TeamRole = 'admin' | 'advisor';

export interface TeamContext {
  ownerUserId: string;
  memberRole: TeamRole | null;
  isTeamMember: boolean;
}

type TeamMemberRow = {
  owner_user_id: string;
  role: TeamRole | null;
};

type TeamInviteRow = {
  admin_id: string;
  role: TeamRole | null;
};

function isMissingRelation(error: { code?: string; message?: string } | null) {
  return error?.code === '42P01' || error?.message?.includes('does not exist');
}

function normalizeRole(role?: string | null): TeamRole {
  return role === 'admin' ? 'admin' : 'advisor';
}

/**
 * Resolves which subscription/team owner should back team-scoped resources.
 * It supports the current team_members model, legacy team_invites records, and
 * auth metadata set during invite acceptance.
 */
export async function resolveTeamContext(
  sb: SupabaseClient,
  user: User
): Promise<TeamContext> {
  const email = user.email?.toLowerCase() ?? null;

  const { data: membership, error: membershipError } = await sb
    .from('team_members')
    .select('owner_user_id, role')
    .eq('member_user_id', user.id)
    .eq('status', 'active')
    .maybeSingle<TeamMemberRow>();

  if (!membershipError && membership?.owner_user_id) {
    return {
      ownerUserId: membership.owner_user_id,
      memberRole: normalizeRole(membership.role),
      isTeamMember: true,
    };
  }

  if (membershipError && !isMissingRelation(membershipError)) {
    console.warn('[resolveTeamContext] team_members lookup failed:', membershipError.message);
  }

  const inviteQuery = sb
    .from('team_invites')
    .select('admin_id, role')
    .in('status', ['accepted', 'pending'])
    .limit(1);

  const { data: inviteByUserId, error: inviteByUserIdError } = await inviteQuery
    .eq('advisor_user_id', user.id)
    .maybeSingle<TeamInviteRow>();

  if (!inviteByUserIdError && inviteByUserId?.admin_id) {
    return {
      ownerUserId: inviteByUserId.admin_id,
      memberRole: normalizeRole(inviteByUserId.role),
      isTeamMember: inviteByUserId.admin_id !== user.id,
    };
  }

  if (inviteByUserIdError && !isMissingRelation(inviteByUserIdError)) {
    console.warn('[resolveTeamContext] team_invites user lookup failed:', inviteByUserIdError.message);
  }

  if (email) {
    const { data: inviteByEmail, error: inviteByEmailError } = await sb
      .from('team_invites')
      .select('admin_id, role')
      .eq('email', email)
      .in('status', ['accepted', 'pending'])
      .limit(1)
      .maybeSingle<TeamInviteRow>();

    if (!inviteByEmailError && inviteByEmail?.admin_id) {
      return {
        ownerUserId: inviteByEmail.admin_id,
        memberRole: normalizeRole(inviteByEmail.role),
        isTeamMember: inviteByEmail.admin_id !== user.id,
      };
    }

    if (inviteByEmailError && !isMissingRelation(inviteByEmailError)) {
      console.warn('[resolveTeamContext] team_invites email lookup failed:', inviteByEmailError.message);
    }

    const adminClient = getServiceRoleClient();
    const { data: serviceInvite, error: serviceInviteError } = await adminClient
      .from('team_invites')
      .select('admin_id, role')
      .eq('email', email)
      .in('status', ['accepted', 'pending'])
      .limit(1)
      .maybeSingle<TeamInviteRow>();

    if (!serviceInviteError && serviceInvite?.admin_id) {
      acceptPendingInviteForUser(user).catch(() => {});
      return {
        ownerUserId: serviceInvite.admin_id,
        memberRole: normalizeRole(serviceInvite.role),
        isTeamMember: serviceInvite.admin_id !== user.id,
      };
    }

    if (serviceInviteError && !isMissingRelation(serviceInviteError)) {
      console.warn('[resolveTeamContext] service team_invites email lookup failed:', serviceInviteError.message);
    }
  }

  const invitedBy = user.user_metadata?.invited_by;
  if (typeof invitedBy === 'string' && invitedBy) {
    return {
      ownerUserId: invitedBy,
      memberRole: normalizeRole(user.user_metadata?.role),
      isTeamMember: invitedBy !== user.id,
    };
  }

  return {
    ownerUserId: user.id,
    memberRole: null,
    isTeamMember: false,
  };
}
