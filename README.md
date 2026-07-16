# MT Proof Engine

Capture a client win in 15 minutes by talking. Get back a growing, searchable library of Claims backed by Proof Points, publishable case studies, SPIN-style sales questions, and role-targeted social content.

Built for Mineral Technologies: Next.js (App Router) + Tailwind, Supabase (Postgres, magic-link auth, storage), Anthropic API for all generation stages.

## The domain model

Claims and Proof Points are first-class database entities, not text inside documents.

- **Story**: a raw captured win. One client, one narrative arc.
- **Claim**: a statement of value MT wants to make in the market. Lifecycle: candidate → developing → proven (2+ confirmed proof points) → retired. Carries stress-test notes (so what / we do that too / prove it).
- **Proof Point**: a single verifiable piece of evidence extracted from a story, with confidence (confirmed / reported / missing), a source reference, and client-approval status.
- **Case Study**: a publishable asset assembled from a story (draft → in_review → client_approval → published).
- **SPIN Question**: sales questions reverse-engineered from stories and claims (situation / problem / implication / need_payoff).
- **Social Post Idea**: role-targeted LinkedIn drafts generated on publication. Never auto-posted.

## Setup

### 1. Supabase

Create (or restore) a Supabase project, then apply the migrations and seed:

```sh
# with the Supabase CLI linked to your project
supabase db push          # applies supabase/migrations/*.sql
psql "$DATABASE_URL" -f supabase/seed.sql   # or paste seed.sql into the SQL editor
```

`0001_schema.sql` creates all tables, enums and row-level security. `0002_storage.sql` creates the private `voice-notes` and `story-files` buckets. `seed.sql` loads the personas, product tags, and the Mindarie story with its three claims, [XX]-valued proof points and open gaps, so the gap-chasing workflow has real work from day one.

In Supabase Auth settings, enable the **Email** provider (magic links) and add your site URL to the redirect allow-list (`https://your-app/auth/callback`).

### 2. Environment

```sh
cp .env.example .env.local
```

Fill in the Supabase URL, anon key and service-role key, your `ANTHROPIC_API_KEY`, and `NEXT_PUBLIC_SITE_URL`. Voice transcription (Stage 0) is pluggable: set `TRANSCRIPTION_PROVIDER=openai` and `OPENAI_API_KEY` to use Whisper. With no provider set, voice notes are stored and flagged for manual transcription and the rest of the pipeline still runs on typed answers and documents (Claude models do not accept audio input).

### 3. Run

```sh
npm install
npm run dev
```

The first person to sign in gets the `contributor` role. Promote yourself to Marketing Owner once:

```sql
update users set role = 'marketing' where email = 'you@mineraltechnologies.com';
```

After that, roles are managed in the app at `/admin`.

## The AI pipeline

Triggered on story submission, runs server-side with progress written to the story:

- **Stage 0** transcription (pluggable provider)
- **Stage 1** intake brief: one call with all transcripts + extracted file text (PDF/docx/xlsx/eml parsed server-side; images passed to the model as vision input). Output parsed into the brief, proof points, client quotes and gaps. System prompt: `src/lib/ai/prompts.ts` (Appendix A, verbatim).
- **Stage 2** claims matching against the current library; genuinely new candidate claims are created as `candidate`.
- **Stage 3** SPIN generation, triggered when a proof point is confirmed or run manually per claim. Approved at `/spin` before sales see them.
- **Stage 4** social post ideas on case study publication (also on demand from the builder).
- **Stage 5** value proposition synthesis (April Dunford structure), on demand from the Claims Library.

Hard rules are enforced in every prompt: never invent numbers ([XX] placeholders), flag conflicts, Australian English, MT voice, no em dashes.

## Screens

| Route | Who | What |
|-------|-----|------|
| `/capture` | Everyone | Voice-first capture flow, one question at a time, save/resume, file drop, ~60s result screen |
| `/my-stories` | Everyone | Your submissions and their status |
| `/review` | Marketing | Queue + two-panel brief review: edit drafts, confirm/reject proof points, assign claims, chase gaps, set approval status, promote to case study |
| `/claims` | Marketing | The Claims Library: health (red/amber/green), stress-test fields, filters, value proposition synthesis |
| `/spin` | Marketing | Approve/edit SPIN questions |
| `/case-studies/:id` | Marketing | Builder with live MT-branded preview; share link, print view, copy-as-markdown; social drafts |
| `/share/case-study/:id` | Public when published | The one-pager (meta strip, hero + pullquote, challenge/approach, dark outcomes band, claims row, CTA) |
| `/library` | Sales | Persona/product/story-type filtered claims, case studies and SPIN question sets; capture requests |
| `/dashboard` | Marketing, Leadership | Stories per month, claims by lifecycle, confidence mix, coverage matrix, stalest gaps, pending approvals |
| `/admin` | Marketing | Invite teammates, assign roles |

## Development

```sh
npm run typecheck
npm run build
```
