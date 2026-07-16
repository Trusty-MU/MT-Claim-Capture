import { cn, PALETTE_BG, PALETTE_FG_ON } from '@/lib/utils';
import {
  STORY_TYPE_COLORS,
  STORY_TYPE_SHORT,
  type ClaimStatus,
  type ConfidenceLevel,
  type ApprovalStatus,
  type StoryStatus,
  type StoryType,
  type CaseStudyStatus,
} from '@/lib/types';

export function InfoLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('mt-label', className)}>{children}</span>;
}

export function StoryTypeBadge({ type }: { type: StoryType | null }) {
  if (!type) return <span className="text-xs text-mt-dust">Untyped</span>;
  const color = STORY_TYPE_COLORS[type];
  return (
    <span
      className={cn(
        'inline-block px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em]',
        PALETTE_BG[color],
        PALETTE_FG_ON[color]
      )}
    >
      {STORY_TYPE_SHORT[type]}
    </span>
  );
}

const CONFIDENCE_STYLES: Record<ConfidenceLevel, string> = {
  confirmed: 'bg-mt-coast text-mt-black-sand',
  reported: 'bg-mt-sun text-mt-black-sand',
  missing: 'bg-mt-red-ore text-white',
};

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  return (
    <span className={cn('inline-block px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em]', CONFIDENCE_STYLES[level])}>
      {level}
    </span>
  );
}

const APPROVAL_STYLES: Record<ApprovalStatus, string> = {
  public: 'bg-mt-coast text-mt-black-sand',
  needs_approval: 'bg-mt-sun text-mt-black-sand',
  internal_only: 'bg-mt-black-sand text-white',
};

const APPROVAL_LABELS: Record<ApprovalStatus, string> = {
  public: 'Public',
  needs_approval: 'Needs approval',
  internal_only: 'Internal only',
};

export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  return (
    <span className={cn('inline-block px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em]', APPROVAL_STYLES[status])}>
      {APPROVAL_LABELS[status]}
    </span>
  );
}

const STORY_STATUS_LABELS: Record<StoryStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  processing: 'Processing',
  brief_ready: 'Brief ready',
  in_review: 'In review',
  reviewed: 'Reviewed',
};

const STORY_STATUS_STYLES: Record<StoryStatus, string> = {
  draft: 'bg-mt-sand text-mt-black-sand',
  submitted: 'bg-mt-dust text-mt-black-sand',
  processing: 'bg-mt-sun text-mt-black-sand',
  brief_ready: 'bg-mt-red-ore text-white',
  in_review: 'bg-mt-ocean text-mt-black-sand',
  reviewed: 'bg-mt-coast text-mt-black-sand',
};

export function StoryStatusChip({ status }: { status: StoryStatus }) {
  return (
    <span className={cn('inline-block px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em]', STORY_STATUS_STYLES[status])}>
      {STORY_STATUS_LABELS[status]}
    </span>
  );
}

const CS_STATUS_LABELS: Record<CaseStudyStatus, string> = {
  draft: 'Draft',
  in_review: 'In review',
  client_approval: 'Client approval',
  published: 'Published',
};

export function CaseStudyStatusChip({ status }: { status: CaseStudyStatus }) {
  const styles: Record<CaseStudyStatus, string> = {
    draft: 'bg-mt-sand text-mt-black-sand',
    in_review: 'bg-mt-ocean text-mt-black-sand',
    client_approval: 'bg-mt-sun text-mt-black-sand',
    published: 'bg-mt-coast text-mt-black-sand',
  };
  return (
    <span className={cn('inline-block px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em]', styles[status])}>
      {CS_STATUS_LABELS[status]}
    </span>
  );
}

/**
 * Claim health: 0 confirmed proof points = red, 1 = amber, 2+ = green.
 */
export function ClaimHealthDot({ confirmedCount }: { confirmedCount: number }) {
  const color = confirmedCount >= 2 ? 'bg-mt-coast' : confirmedCount === 1 ? 'bg-mt-sun' : 'bg-mt-red-ore';
  const label = confirmedCount >= 2 ? 'Healthy' : confirmedCount === 1 ? 'Needs one more' : 'No confirmed proof';
  return (
    <span className="inline-flex items-center gap-1.5" title={`${label}: ${confirmedCount} confirmed proof point${confirmedCount === 1 ? '' : 's'}`}>
      <span className={cn('h-3 w-3 rounded-full', color)} />
      <span className="text-xs font-bold">{confirmedCount}</span>
    </span>
  );
}

const CLAIM_STATUS_STYLES: Record<ClaimStatus, string> = {
  candidate: 'bg-mt-sand text-mt-black-sand',
  developing: 'bg-mt-sun text-mt-black-sand',
  proven: 'bg-mt-coast text-mt-black-sand',
  retired: 'bg-mt-dust text-mt-black-sand line-through',
};

export function ClaimStatusChip({ status }: { status: ClaimStatus }) {
  return (
    <span className={cn('inline-block px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em]', CLAIM_STATUS_STYLES[status])}>
      {status}
    </span>
  );
}
