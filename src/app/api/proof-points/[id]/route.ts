import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateSpinQuestions } from '@/lib/ai/pipeline';

const EDITABLE = ['metric', 'value', 'unit', 'confidence', 'approval', 'review', 'notes'] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireApiRole(['marketing']);
  if (gate.error) return gate.error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = {};
  for (const field of EDITABLE) if (field in body) update[field] = body[field];

  const admin = createAdminClient();

  // Claim links can be set in the same call: { claim_ids: [...] }
  if (Array.isArray(body.claim_ids)) {
    await admin.from('claim_proof_points').delete().eq('proof_point_id', id);
    for (const claimId of body.claim_ids) {
      await admin.from('claim_proof_points').insert({ claim_id: claimId, proof_point_id: id });
    }
  }

  let proofPoint = null;
  if (Object.keys(update).length) {
    const { data, error } = await admin.from('proof_points').update(update).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    proofPoint = data;

    // Stage 3 trigger: a confirmed proof point refreshes SPIN questions for
    // the claims it supports. Failures are non-fatal.
    if (update.review === 'confirmed') {
      const { data: links } = await admin.from('claim_proof_points').select('claim_id').eq('proof_point_id', id);
      for (const link of links ?? []) {
        generateSpinQuestions(link.claim_id).catch((err) => console.error('SPIN generation failed:', err));
      }
    }
  }

  return NextResponse.json({ proofPoint });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireApiRole(['marketing']);
  if (gate.error) return gate.error;
  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from('proof_points').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
