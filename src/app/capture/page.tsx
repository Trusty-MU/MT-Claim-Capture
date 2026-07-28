import Link from 'next/link';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { QuarterCircle } from '@/components/brand/QuarterCircle';
import { StartButtons } from './StartButtons';
import type { Story } from '@/lib/types';
import { authBypassEnabled, isSyntheticProfile } from '@/lib/auth-bypass';

export default async function CapturePage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const showAll = authBypassEnabled() && isSyntheticProfile(profile);
  const draftQuery = supabase
    .from('stories')
    .select('*')
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(5);
  const { data: drafts } = showAll ? await draftQuery : await draftQuery.eq('contributor_id', profile.id);

  return (
    <div className="relative flex min-h-screen flex-col bg-mt-sand">
      <QuarterCircle />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <span className="mt-label">Mineral Technologies</span>
        <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight">
          Got a win worth telling?
        </h1>
        <p className="mt-3 text-lg text-mt-black-sand/70">
          This takes about 15 minutes. Talk, don&apos;t type.
        </p>

        <StartButtons />

        {(drafts as Story[] | null)?.length ? (
          <div className="mt-10 border-t-2 border-mt-dust pt-6">
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-mt-black-sand/60">
              Pick up where you left off
            </p>
            <ul className="mt-2 space-y-2">
              {(drafts as Story[]).map((d) => (
                <li key={d.id}>
                  <Link href={`/capture/${d.id}`} className="block bg-white p-3 font-bold hover:text-mt-red-ore">
                    {d.client_name || 'Untitled win'}{' '}
                    <span className="font-normal text-mt-black-sand/50">
                      · started {new Date(d.created_at).toLocaleDateString('en-AU')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mt-10 text-center text-sm text-mt-black-sand/50">
          Signed in as {profile.email}
        </p>
      </div>
    </div>
  );
}
