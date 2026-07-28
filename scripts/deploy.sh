#!/usr/bin/env bash
# Deploy the MT Proof Engine to Vercel.
#
# Secrets are read from the environment and piped straight to `vercel env add`;
# nothing is written to disk. Required:
#
#   VERCEL_TOKEN                 vercel.com/account/tokens
#   SUPABASE_SERVICE_ROLE_KEY    Supabase dashboard, Project Settings -> API keys
#   ANTHROPIC_API_KEY            console.anthropic.com
#
# Optional (defaults shown):
#   SUPABASE_URL       https://qbungwjqtjawqzozmnyd.supabase.co
#   SUPABASE_ANON_KEY  the project's publishable key
#   ANTHROPIC_MODEL    claude-sonnet-4-6
#   PROJECT_NAME       mt-proof-engine
#
# Usage: VERCEL_TOKEN=... SUPABASE_SERVICE_ROLE_KEY=... ANTHROPIC_API_KEY=... ./scripts/deploy.sh

set -euo pipefail

: "${VERCEL_TOKEN:?set VERCEL_TOKEN}"
: "${SUPABASE_SERVICE_ROLE_KEY:?set SUPABASE_SERVICE_ROLE_KEY}"
: "${ANTHROPIC_API_KEY:?set ANTHROPIC_API_KEY}"

SUPABASE_URL="${SUPABASE_URL:-https://qbungwjqtjawqzozmnyd.supabase.co}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-sb_publishable_puphtaj3HRG3zAjWJofa9g_ZvpgqyKA}"
ANTHROPIC_MODEL="${ANTHROPIC_MODEL:-claude-sonnet-4-6}"
PROJECT_NAME="${PROJECT_NAME:-mt-proof-engine}"

V="vercel --token $VERCEL_TOKEN"

echo "==> Linking project $PROJECT_NAME"
$V link --yes --project "$PROJECT_NAME" >/dev/null

# Vercel rejects a duplicate env var rather than updating it, so remove first.
set_env() {
  local name="$1" value="$2"
  $V env rm "$name" production --yes >/dev/null 2>&1 || true
  printf '%s' "$value" | $V env add "$name" production >/dev/null
  echo "    set $name"
}

echo "==> Setting production environment variables"
set_env NEXT_PUBLIC_SUPABASE_URL "$SUPABASE_URL"
set_env NEXT_PUBLIC_SUPABASE_ANON_KEY "$SUPABASE_ANON_KEY"
set_env SUPABASE_SERVICE_ROLE_KEY "$SUPABASE_SERVICE_ROLE_KEY"
set_env ANTHROPIC_API_KEY "$ANTHROPIC_API_KEY"
set_env ANTHROPIC_MODEL "$ANTHROPIC_MODEL"
[ -n "${TRANSCRIPTION_PROVIDER:-}" ] && set_env TRANSCRIPTION_PROVIDER "$TRANSCRIPTION_PROVIDER"
[ -n "${OPENAI_API_KEY:-}" ] && set_env OPENAI_API_KEY "$OPENAI_API_KEY"

# NEXT_PUBLIC_SITE_URL is baked in at build time and must match the final
# domain, so set it before the first production build.
SITE_URL="${SITE_URL:-https://${PROJECT_NAME}.vercel.app}"
set_env NEXT_PUBLIC_SITE_URL "$SITE_URL"

echo "==> Deploying to production"
$V deploy --prod --yes

echo
echo "Deployed. Remaining manual step in the Supabase dashboard:"
echo "  Authentication -> URL Configuration"
echo "    Site URL:               $SITE_URL"
echo "    Additional redirect URL: $SITE_URL/auth/callback"
echo "  Magic links will not return to the app until that redirect is allow-listed."
