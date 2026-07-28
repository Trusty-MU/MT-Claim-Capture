// Env lookups for the Supabase clients.
//
// Without these checks a missing variable surfaces as the Supabase SDK's
// generic "Your project's URL and Key are required to create a Supabase
// client!", which says nothing about which variable is missing or where to
// set it. The whole app 500s, because the middleware builds a client on
// every request.

function missingEnvError(names: string[]): Error {
  return new Error(
    `Supabase configuration missing: ${names.join(', ')}. ` +
      `Set these in the deployment environment. Note that NEXT_PUBLIC_* values are ` +
      `inlined at build time, so after adding them you must trigger a fresh build; ` +
      `adding them to an existing deployment without rebuilding has no effect. ` +
      `Values come from the Supabase dashboard under Project Settings -> API keys.`
  );
}

/** URL + publishable key, used by the browser, server and middleware clients. */
export function publicSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const missing: string[] = [];
  if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!anonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (missing.length) throw missingEnvError(missing);

  return { url: url!, anonKey: anonKey! };
}

/** URL + service role key. Server-side only; bypasses RLS. */
export function adminSupabaseEnv(): { url: string; serviceRoleKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing: string[] = [];
  if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length) throw missingEnvError(missing);

  return { url: url!, serviceRoleKey: serviceRoleKey! };
}
