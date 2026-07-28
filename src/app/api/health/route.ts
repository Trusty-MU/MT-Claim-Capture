import { NextResponse } from 'next/server';

// Configuration diagnostic. Reachable without auth and without a working
// Supabase connection, because it is the thing you need when those are broken.
//
// Secret values are never returned, only whether they are present. The Supabase
// URL and the publishable key are returned in part because they are not secret
// (both ship in the browser bundle) and because seeing them is what catches a
// deployment pointed at the wrong project.

export const dynamic = 'force-dynamic';

function present(v: string | undefined) {
  return { set: Boolean(v), length: v?.length ?? 0 };
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const required = {
    NEXT_PUBLIC_SUPABASE_URL: { ...present(url), value: url ?? null },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      ...present(anonKey),
      // enough to tell one key from another without printing it in full
      prefix: anonKey ? `${anonKey.slice(0, 12)}…` : null,
    },
    SUPABASE_SERVICE_ROLE_KEY: present(process.env.SUPABASE_SERVICE_ROLE_KEY),
    ANTHROPIC_API_KEY: present(process.env.ANTHROPIC_API_KEY),
  };

  const authBypass = process.env.AUTH_BYPASS === 'true';

  const optional = {
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL ?? null,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    TRANSCRIPTION_PROVIDER: process.env.TRANSCRIPTION_PROVIDER ?? null,
  };

  const missing = Object.entries(required)
    .filter(([, v]) => !v.set)
    .map(([k]) => k);

  // The expected project for this app. A mismatch here means the deployment is
  // talking to the wrong database, which otherwise only shows up as confusing
  // "relation does not exist" errors later.
  const expectedProjectRef = 'giicdspcpeunmosqmeio';
  const projectRefMatches = url ? url.includes(expectedProjectRef) : null;

  return NextResponse.json(
    {
      ok: missing.length === 0 && projectRefMatches !== false,
      missing,
      projectRef: { expected: expectedProjectRef, matches: projectRefMatches },
      authBypass: authBypass
        ? { enabled: true, warning: 'Sign-in is disabled; every request has full access.' }
        : { enabled: false },
      required,
      optional,
    },
    { status: missing.length === 0 ? 200 : 503 }
  );
}
