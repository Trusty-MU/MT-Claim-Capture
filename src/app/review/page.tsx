import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { StoryStatusChip, StoryTypeBadge } from '@/components/brand/badges';
import { formatDate } from '@/lib/utils';
import type { Story } from '@/lib/types';

const ORDER: Record<string, number> = { brief_ready: 0, processing: 1, submitted: 2, in_review: 3, reviewed: 4, draft: 5 };

export default async function ReviewQueuePage() {
  const profile = await requireRole(['marketing']);
  const supabase = await createClient();

  const { data } = await supabase
    .from('stories')
    .select('*')
    .neq('status', 'draft')
    .order('created_at', { ascending: false });

  const stories = ((data ?? []) as Story[]).sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9));

  return (
    <AppShell profile={profile}>
      <h1 className="text-3xl font-extrabold tracking-tight">Review queue</h1>
      <p className="mt-2 text-mt-black-sand/70">Submitted stories, briefs ready for review, and what&apos;s already through.</p>

      {stories.length ? (
        <ul className="mt-6 divide-y-2 divide-mt-sand">
          {stories.map((story) => (
            <li key={story.id} className="py-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/review/${story.id}`} className="font-bold hover:text-mt-red-ore">
                    {story.client_name || 'Untitled win'}
                  </Link>
                  <p className="text-sm text-mt-black-sand/60">
                    {[story.commodity, story.location].filter(Boolean).join(' · ') || 'Awaiting brief'} · submitted{' '}
                    {formatDate(story.submitted_at ?? story.created_at)}
                  </p>
                </div>
                <StoryTypeBadge type={story.story_type} />
                <StoryStatusChip status={story.status} />
              </div>
              {story.pipeline_stage && (
                <p className="mt-1 text-sm font-bold text-mt-gold">{story.pipeline_stage}</p>
              )}
              {story.pipeline_error && (
                <p className="mt-1 text-sm font-bold text-mt-red-ore">Pipeline failed: {story.pipeline_error}</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 bg-mt-sand/50 p-8 text-center">
          <p className="font-bold">Queue&apos;s clear. No stories waiting.</p>
        </div>
      )}
    </AppShell>
  );
}
