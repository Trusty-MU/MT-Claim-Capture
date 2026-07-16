import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import { UserAdmin } from './UserAdmin';
import type { Profile } from '@/lib/types';

export default async function AdminPage() {
  const profile = await requireRole(['marketing']);
  const admin = createAdminClient();

  const { data: users } = await admin.from('users').select('*').order('created_at');

  return (
    <AppShell profile={profile}>
      <h1 className="text-3xl font-extrabold tracking-tight">Admin</h1>
      <p className="mt-2 text-mt-black-sand/70">
        Who&apos;s who. Everyone signs in with an email link; roles decide what they see.
      </p>
      <UserAdmin users={(users ?? []) as Profile[]} selfId={profile.id} />
    </AppShell>
  );
}
