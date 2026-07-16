-- MT Proof Engine seed data.
-- Personas and product tags, plus the Mindarie story as the first record so the
-- gaps workflow has real work from day one. [XX] values are deliberate: they are
-- missing numbers for the Marketing Owner to chase.

-- ---------------------------------------------------------------------------
-- Personas
-- ---------------------------------------------------------------------------
insert into personas (name, description) values
  ('Sceptic', 'Technical director, independent engineer. Wants evidence, distrusts marketing.'),
  ('Visionary', 'CEO, founder. Cares about the strategic story and time to first revenue.'),
  ('Project Director', 'Delivery owner. Cares about schedule, budget, single point of accountability.'),
  ('Plant Manager', 'Runs the operation. Cares about recovery, availability, downtime.'),
  ('Procurement', 'Commercial gatekeeper. Cares about total cost, risk, references.')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Product tags (secondary palette keys colour-code them in the UI)
-- ---------------------------------------------------------------------------
insert into product_tags (name, color) values
  ('Spirals', 'ocean'),
  ('Magnetic Separators', 'gold'),
  ('Electrostatic Separators', 'sun'),
  ('Testwork', 'ocean'),
  ('Process Design', 'coast'),
  ('Studies', 'coast'),
  ('Mining Method', 'red-earth'),
  ('Project Economics', 'gold'),
  ('Plant Engineering', 'coast'),
  ('Equipment Supply', 'gold'),
  ('Construction', 'red-earth'),
  ('Commissioning', 'red-earth'),
  ('Service & Support', 'coral')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- The Mindarie story
-- ---------------------------------------------------------------------------
insert into stories (id, client_name, commodity, location, story_type, status,
  scope_elements, date_start, date_end, current_status, product_tags)
values (
  '00000000-0000-0000-0000-000000000001',
  'Mindarie Mineral Sands Project',
  'Mineral sands',
  'Murray Basin, South Australia',
  'project_delivery',
  'reviewed',
  array['Testwork', 'Process Design', 'Plant Engineering', 'Equipment Supply', 'Construction', 'Commissioning'],
  '[XX]',
  '[XX]',
  'Commissioned and handed over',
  array['Testwork', 'Process Design', 'Plant Engineering', 'Equipment Supply', 'Commissioning']
);

-- The three Mindarie claims
insert into claims (id, title, description, status, so_what, we_do_that_too, prove_it, personas, product_tags) values
(
  '00000000-0000-0000-0000-000000000101',
  'The fastest path from your sample to first revenue',
  'One team takes a project from metallurgical sample to a commissioned, revenue-generating plant faster than the conventional study-tender-EPC route.',
  'developing',
  'Every quarter of delay costs a developer market confidence and raise headroom. Speed to first revenue is the metric boards and investors actually feel.',
  'Large EPCs claim speed but their model needs a completed study and a tender cycle before anything moves. Few competitors own testwork, design, manufacture and commissioning in one line of accountability.',
  'Months from engagement to commissioning versus what the client expected or others quoted, on named projects. Mindarie: 14 months reported; needs document confirmation.',
  array['Visionary', 'Project Director'],
  array['Testwork', 'Process Design', 'Commissioning']
),
(
  '00000000-0000-0000-0000-000000000102',
  'FID-grade documentation without major EPC price or timelines',
  'Study and engineering documentation an investment committee can approve first pass, delivered without the cost and calendar of a tier-one EPC.',
  'developing',
  'Developers of marginal ore bodies cannot carry major EPC study costs. Documentation that passes an investment committee unlocks the raise.',
  'Boutique consultancies produce studies too, but few can stand behind the numbers with their own testwork and equipment performance data.',
  'A named investment committee or financier accepting MT documentation first pass; study cost versus a major EPC benchmark. Values currently missing.',
  array['Visionary', 'Procurement', 'Sceptic'],
  array['Studies', 'Project Economics', 'Process Design']
),
(
  '00000000-0000-0000-0000-000000000103',
  'Whole-project development and delivery built around the asset',
  'Mining method, flowsheet, economics and plant are developed around what the ore body can support, not around a standard plant design.',
  'developing',
  'Marginal ore bodies fail conventional studies. An approach built around the asset turns "uneconomic" into a financeable project.',
  'Everyone says "tailored solutions". The difference is MT adjusting mining method and project scope against project economics in-house.',
  'A project deemed marginal under a conventional flowsheet that reached FID and production under an MT-developed approach, with the before/after economics.',
  array['Visionary', 'Sceptic', 'Project Director'],
  array['Mining Method', 'Project Economics', 'Process Design']
);

-- Company-wide candidate claims
insert into claims (title, description, status, personas, product_tags) values
(
  'Process knowledge and equipment manufacture under one roof',
  'MT designs the flowsheet and manufactures the separation equipment that delivers it, so performance accountability never splits across vendors.',
  'candidate',
  array['Sceptic', 'Procurement'],
  array['Equipment Supply', 'Process Design']
),
(
  'Proven from lab to pilot to plant',
  'Recoveries demonstrated at laboratory scale hold at pilot and at operating plant scale, documented across the same ore.',
  'candidate',
  array['Sceptic'],
  array['Testwork']
),
(
  'Measured gains at operating plants',
  'Recovery, grade and throughput improvements measured before and after MT interventions at running operations.',
  'candidate',
  array['Plant Manager', 'Sceptic'],
  array['Service & Support', 'Spirals', 'Magnetic Separators']
),
(
  'Long-term support for the life of the plant',
  'MT stays with the plant after commissioning: audits, spares, upgrades and response when it matters.',
  'candidate',
  array['Plant Manager', 'Procurement'],
  array['Service & Support']
);

-- Proof points. The 14-month figure was reported in conversation; the rest are
-- referenced without values, which is exactly the gap-chasing work the app exists for.
insert into proof_points (id, story_id, metric, value, unit, confidence, approval, review, source_note) values
(
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000001',
  'Engagement to commissioning', '14', 'months', 'reported', 'needs_approval', 'confirmed',
  'Reported in project retrospective conversation; needs the project schedule to confirm.'
),
(
  '00000000-0000-0000-0000-000000000202',
  '00000000-0000-0000-0000-000000000001',
  'Project IRR after MT scope and flowsheet rework', '[XX]', '%', 'missing', 'needs_approval', 'pending',
  'Referenced without a value. The study comparison should hold the before/after.'
),
(
  '00000000-0000-0000-0000-000000000203',
  '00000000-0000-0000-0000-000000000001',
  'Delivered cost versus major EPC benchmark', '[XX]', '% of EPC quote', 'missing', 'needs_approval', 'pending',
  'Referenced without a value. Needs the tender comparison or board paper.'
),
(
  '00000000-0000-0000-0000-000000000204',
  '00000000-0000-0000-0000-000000000001',
  'Production tonnes versus schedule in first year', '[XX]', 't', 'missing', 'needs_approval', 'pending',
  'Referenced without a value. Needs production reporting from the client.'
);

insert into claim_proof_points (claim_id, proof_point_id) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000201'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000203'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000202'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000204');

-- Gaps to chase, one per missing value
insert into gaps (story_id, description, owner_name, status) values
  ('00000000-0000-0000-0000-000000000001', 'Confirm 14 months engagement-to-commissioning against the project schedule.', null, 'open'),
  ('00000000-0000-0000-0000-000000000001', 'IRR before and after MT scope rework. Likely in the study comparison.', null, 'open'),
  ('00000000-0000-0000-0000-000000000001', 'Delivered cost versus the major EPC benchmark quote.', null, 'open'),
  ('00000000-0000-0000-0000-000000000001', 'First-year production tonnes versus schedule. Client production reports.', null, 'open'),
  ('00000000-0000-0000-0000-000000000001', 'Client approval status: can we name the project and use the numbers publicly?', null, 'open');

-- The Mindarie case study (mirrors the existing one-pager)
insert into case_studies (id, story_id, status, title, meta_strip, pullquote, challenge, approach,
  featured_proof_point_ids, featured_claim_ids, cta_text)
values (
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000001',
  'draft',
  'From marginal ore body to commissioned plant in 14 months',
  'Mineral sands | Murray Basin, South Australia | Project delivery',
  'The conventional answer said the economics were too thin. Building the project around the asset said otherwise.',
  'The Mindarie ore body had been assessed as marginal under a conventional flowsheet and delivery model. Study costs and EPC timelines threatened the economics before the project could reach a decision.',
  'MT developed the mining method, flowsheet and project scope around what the asset could support, carried its own testwork through design, manufactured the separation equipment, and took the plant through construction to commissioning as one accountable team.',
  array['00000000-0000-0000-0000-000000000201'::uuid, '00000000-0000-0000-0000-000000000202'::uuid, '00000000-0000-0000-0000-000000000203'::uuid, '00000000-0000-0000-0000-000000000204'::uuid],
  array['00000000-0000-0000-0000-000000000101'::uuid, '00000000-0000-0000-0000-000000000102'::uuid, '00000000-0000-0000-0000-000000000103'::uuid],
  'Talk to us about the path from your sample to first revenue.'
);
