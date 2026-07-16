import { notFound } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { CaptureFlow } from '@/components/capture/CaptureFlow';
import { QuarterCircle } from '@/components/brand/QuarterCircle';
import type { Story, StoryInput } from '@/lib/types';
import Link from 'next/link';

export default async function CaptureStoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ storyId: string }>;
  searchParams: Promise<{ files?: string }>;
}) {
  await requireProfile();
  const { storyId } = await params;
  const { files } = await searchParams;
  const supabase = await createClient();

  const { data: story } = await supabase.from('stories').select('*').eq('id', storyId).single();
  if (!story) notFound();

  const { data: inputs } = await supabase
    .from('story_inputs')
    .select('*')
    .eq('story_id', storyId)
    .order('created_at');

  return (
    <div className="relative min-h-screen bg-white">
      <QuarterCircle />
      <div className="mx-auto max-w-md px-4 pb-8 pt-6">
        <Link href="/capture" className="text-xs font-bold uppercase tracking-[0.08em] text-mt-black-sand/50 hover:text-mt-black-sand">
          Save &amp; finish later
        </Link>
        <div className="mt-6">
          <CaptureFlow story={story as Story} inputs={(inputs ?? []) as StoryInput[]} fastPath={files === '1'} />
        </div>
      </div>
    </div>
  );
}
