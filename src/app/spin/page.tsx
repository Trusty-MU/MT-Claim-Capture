import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { AppShell } from '@/components/AppShell';
import { SpinModeration } from './SpinModeration';
import type { Claim, SpinQuestion } from '@/lib/types';

export default async function SpinPage() {
  const profile = await requireRole(['marketing']);
  const admin = createAdminClient();

  const [{ data: questions }, { data: claims }] = await Promise.all([
    admin.from('spin_questions').select('*').order('approved').order('created_at', { ascending: false }),
    admin.from('claims').select('id, title').order('title'),
  ]);

  return (
    <AppShell profile={profile}>
      <SpinModeration questions={(questions ?? []) as SpinQuestion[]} claims={(claims ?? []) as Pick<Claim, 'id' | 'title'>[]} />
    </AppShell>
  );
}
