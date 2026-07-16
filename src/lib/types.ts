// Domain types mirroring the Postgres schema.

export type UserRole = 'contributor' | 'marketing' | 'sales' | 'leadership';

export type StoryType =
  | 'project_delivery'
  | 'equipment_upgrade'
  | 'testwork_study'
  | 'plant_optimisation'
  | 'service_partnership';

export type StoryStatus = 'draft' | 'submitted' | 'processing' | 'brief_ready' | 'in_review' | 'reviewed';
export type InputKind = 'voice' | 'file' | 'text';
export type ClaimStatus = 'candidate' | 'developing' | 'proven' | 'retired';
export type ConfidenceLevel = 'confirmed' | 'reported' | 'missing';
export type ApprovalStatus = 'public' | 'needs_approval' | 'internal_only';
export type ReviewStatus = 'pending' | 'confirmed' | 'rejected';
export type CaseStudyStatus = 'draft' | 'in_review' | 'client_approval' | 'published';
export type SpinType = 'situation' | 'problem' | 'implication' | 'need_payoff';
export type GapStatus = 'open' | 'chasing' | 'resolved';
export type SuggestionStatus = 'suggested' | 'approved' | 'dismissed';

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  created_at: string;
}

export interface Story {
  id: string;
  contributor_id: string | null;
  client_name: string | null;
  commodity: string | null;
  location: string | null;
  story_type: StoryType | null;
  status: StoryStatus;
  scope_elements: string[];
  date_start: string | null;
  date_end: string | null;
  current_status: string | null;
  product_tags: string[];
  pipeline_stage: string | null;
  pipeline_error: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoryInput {
  id: string;
  story_id: string;
  kind: InputKind;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  transcript_or_text: string | null;
  transcription_status: string | null;
  question_number: number | null;
  created_at: string;
}

export interface BriefSnapshot {
  client?: string;
  commodity?: string;
  location?: string;
  scope_elements?: string[];
  dates?: string;
  current_status?: string;
}

export interface BriefOutcome {
  metric: string;
  value: string;
  unit?: string;
  source?: string;
  confidence: 'CONFIRMED' | 'REPORTED' | 'MISSING';
}

export interface BriefCandidateClaim {
  claim_text: string;
  supported: boolean;
  evidence_note?: string;
}

export interface BriefClientVoice {
  quote: string;
  speaker?: string;
  context?: string;
  approval_status?: string;
}

export interface BriefGap {
  description: string;
  chase_person?: string;
}

export interface BriefJson {
  story_type: StoryType;
  snapshot: BriefSnapshot;
  challenge_draft: string;
  approach_draft: string;
  pullquote_suggestion?: string;
  outcomes: BriefOutcome[];
  candidate_claims: BriefCandidateClaim[];
  client_voice: BriefClientVoice[];
  gaps: BriefGap[];
  risk_flags: string[];
}

export interface Brief {
  id: string;
  story_id: string;
  snapshot_json: BriefSnapshot | null;
  challenge_draft: string | null;
  approach_draft: string | null;
  pullquote_suggestion: string | null;
  raw_json: BriefJson | null;
  created_at: string;
}

export interface Claim {
  id: string;
  title: string;
  description: string | null;
  status: ClaimStatus;
  so_what: string | null;
  we_do_that_too: string | null;
  prove_it: string | null;
  personas: string[];
  product_tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ProofPoint {
  id: string;
  story_id: string | null;
  metric: string;
  value: string | null;
  unit: string | null;
  source_input_id: string | null;
  source_note: string | null;
  confidence: ConfidenceLevel;
  approval: ApprovalStatus;
  review: ReviewStatus;
  notes: string | null;
  created_at: string;
}

export interface CaseStudy {
  id: string;
  story_id: string;
  status: CaseStudyStatus;
  title: string | null;
  meta_strip: string | null;
  pullquote: string | null;
  challenge: string | null;
  approach: string | null;
  featured_proof_point_ids: string[];
  featured_claim_ids: string[];
  cta_text: string | null;
  published_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientQuote {
  id: string;
  story_id: string;
  quote_text: string;
  speaker: string | null;
  context: string | null;
  approval: ApprovalStatus;
  created_at: string;
}

export interface Gap {
  id: string;
  story_id: string;
  description: string;
  owner_name: string | null;
  status: GapStatus;
  resolved_note: string | null;
  created_at: string;
}

export interface SpinQuestion {
  id: string;
  type: SpinType;
  text: string;
  claim_id: string | null;
  story_id: string | null;
  story_type: StoryType | null;
  personas: string[];
  product_tags: string[];
  approved: boolean;
  created_at: string;
}

export interface SocialPost {
  id: string;
  case_study_id: string;
  target_role: string;
  draft_text: string;
  sources_note: string | null;
  status: SuggestionStatus;
  created_at: string;
}

export interface ValueProp {
  id: string;
  text: string;
  personas: string[];
  product_tags: string[];
  claim_ids: string[];
  status: SuggestionStatus;
  created_at: string;
}

export interface Persona {
  id: string;
  name: string;
  description: string | null;
}

export interface ProductTag {
  id: string;
  name: string;
  color: string | null;
}

export const STORY_TYPE_LABELS: Record<StoryType, string> = {
  project_delivery: 'We delivered a whole project',
  equipment_upgrade: 'We supplied or upgraded equipment',
  testwork_study: 'We ran testwork or a study',
  plant_optimisation: 'We improved a running plant',
  service_partnership: 'We supported a client long-term',
};

export const STORY_TYPE_SHORT: Record<StoryType, string> = {
  project_delivery: 'Project delivery',
  equipment_upgrade: 'Equipment upgrade',
  testwork_study: 'Testwork & study',
  plant_optimisation: 'Plant optimisation',
  service_partnership: 'Service partnership',
};

// Suggested story-type colour coding (spec section 9)
export const STORY_TYPE_COLORS: Record<StoryType, string> = {
  project_delivery: 'red-earth',
  equipment_upgrade: 'gold',
  testwork_study: 'ocean',
  plant_optimisation: 'coast',
  service_partnership: 'coral',
};

export const SOCIAL_ROLES = [
  { key: 'leadership', label: 'MD / Leadership' },
  { key: 'engineer', label: 'Project lead / Engineer' },
  { key: 'bd_sales', label: 'BD / Sales' },
  { key: 'site_tech', label: 'Service / Site tech' },
] as const;
