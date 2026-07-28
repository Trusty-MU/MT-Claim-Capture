#!/usr/bin/env node
// Create a pre-verified account without sending any email.
//
// Supabase's built-in SMTP is rate limited to a few messages an hour and is
// not intended for production, so verification mail is the usual thing to
// break first. This creates the user with email_confirm already set, so they
// can sign in immediately at /login.
//
// Usage:
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/create-user.mjs blake@trust.mu 'a-good-password' marketing
//
// Role defaults to contributor. Valid: contributor | marketing | sales | leadership

import { createClient } from '@supabase/supabase-js';

const [email, password, role = 'contributor'] = process.argv.slice(2);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !password) {
  console.error('Usage: node scripts/create-user.mjs <email> <password> [role]');
  process.exit(1);
}
if (!url || !serviceKey) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
if (!['contributor', 'marketing', 'sales', 'leadership'].includes(role)) {
  console.error(`Invalid role "${role}". Use contributor, marketing, sales or leadership.`);
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true, // skips the verification email entirely
  user_metadata: { name: email.split('@')[0] },
});

let userId = data?.user?.id;

if (error) {
  // Already registered is fine; find them and update the role below.
  if (!/already/i.test(error.message)) {
    console.error(`Could not create user: ${error.message}`);
    process.exit(1);
  }
  const { data: list } = await admin.auth.admin.listUsers();
  userId = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;
  if (!userId) {
    console.error(`User exists but could not be found: ${email}`);
    process.exit(1);
  }
  console.log(`User already existed: ${email}`);
} else {
  console.log(`Created ${email}`);
}

// handle_new_user() mirrors the auth user into public.users; set the role.
const { error: roleError } = await admin.from('users').update({ role }).eq('id', userId);
if (roleError) {
  console.error(`User exists but the role could not be set: ${roleError.message}`);
  console.error('If this says the row is missing, the schema has not been applied yet.');
  process.exit(1);
}

console.log(`Role set to ${role}. Sign in at /login with this email and password.`);
