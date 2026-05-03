import { getSupabase } from './supabase';

export interface TeamInvite {
  id: string;
  admin_id: string;
  email: string;
  role: 'admin' | 'advisor';
  status: 'pending' | 'accepted';
  created_at: string;
}

/** Fetch all invitations sent by the current admin. */
export async function getTeamInvites(): Promise<TeamInvite[]> {
  try {
    const { data, error } = await getSupabase()
      .from('team_invites')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as TeamInvite[];
  } catch {
    return [];
  }
}

/** Send an invitation email via the server-side API route. */
export async function inviteAdvisor(
  email: string,
  role: 'admin' | 'advisor' = 'advisor'
): Promise<{ ok?: boolean; error?: string; warning?: string }> {
  try {
    const res = await fetch('/api/team/invite', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, role }),
    });
    return await res.json();
  } catch {
    return { error: 'Error de conexión. Intenta de nuevo.' };
  }
}

/** Remove an invitation. */
export async function removeInvite(email: string): Promise<void> {
  try {
    await fetch('/api/team/invite', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email }),
    });
  } catch {
    // fail silently
  }
}
