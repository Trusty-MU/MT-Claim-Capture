-- Storage buckets for voice notes and dropped files.
-- All uploads and downloads go through server routes using the service role,
-- so the buckets stay private with no public policies.

insert into storage.buckets (id, name, public)
values
  ('voice-notes', 'voice-notes', false),
  ('story-files', 'story-files', false)
on conflict (id) do nothing;
