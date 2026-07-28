import Link from 'next/link';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { StoryStatusChip, StoryTypeBadge } from '@/components/brand/badges';
import { formatDate } from '@/lib/utils';
import type { Story } from '@/lib/types';
import { authBypassEnabled, isSyntheticProfile } from '@/lib/auth-bypass';

export default async function MyStoriesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  // Under the bypass the synthetic identity owns nothing, so filtering by it
  // would show an empty list. Show every story instead.
  const showAll = authBypassEnabled() && isSyntheticProfile(profile);
  const query = supabase.from('stories').select('*').order('created_at', { ascending: false });
  const { data: stories } = showAll ? await query : await query.eq('contributor_id', profile.id);

  return (
    <AppShell profile={profile}>
      <h1 className="text-3xl font-extrabold tracking-tight">My stories</h1>
      <p className="mt-2 text-mt-black-sand/70">Everything you&apos;ve told us, and where it&apos;s up to.</p>

      {(stories as Story[] | null)?.length ? (
        <ul className="mt-6 divide-y-2 divide-mt-sand">
          {(stories as Story[]).map((story) => (
            <li key={story.id} className="flex flex-wrap items-center gap-3 py-4">
              <div className="min-w-0 flex-1">
                <Link
                  href={story.status === 'draft' ? `/capture/${story.id}` : `/capture/${story.id}`}
                  className="font-bold hover:text-mt-red-ore"
                >
                  {story.client_name || 'Untitled win'}
                </Link>
                <p className="text-sm text-mt-black-sand/60">
                  {[story.commodity, story.location].filter(Boolean).join(' · ') || 'Details to come'} ·
                  started {formatDate(story.created_at)}
                </p>
              </div>
              <StoryTypeBadge type={story.story_type} />
              <StoryStatusChip status={story.status} />
              {story.status === 'draft' && (
                <Link href={`/capture/${story.id}`} className="text-sm font-bold text-mt-red-ore underline">
                  Keep going
                </Link>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 bg-mt-sand/50 p-8 text-center">
          <p className="font-bold">Nothing here yet.</p>
          <Link href="/capture" className="mt-btn-red mt-4">
            Tell your first win
          </Link>
        </div>
      )}
    </AppShell>
  );
}
