'use client';

import { createBrowserClient } from '@supabase/ssr';
import { publicSupabaseEnv } from './env';

export function createClient() {
  const { url, anonKey } = publicSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
