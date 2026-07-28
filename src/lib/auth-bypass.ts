// Development escape hatch: run the app with no sign-in.
//
// This turns the whole app into an open, fully-privileged surface. Everything
// in here is client-confidential: named clients, unapproved numbers, quotes
// marked internal_only, unpublished case studies. Use it to get moving while
// email delivery is being sorted out, not on anything reachable by people who
// should not see that material.
//
// Off unless AUTH_BYPASS is exactly "true". Deliberately not NEXT_PUBLIC_, so
// it can never be switched on from the browser bundle.

export function authBypassEnabled(): boolean {
  return process.env.AUTH_BYPASS === 'true';
}

/** Which account to act as. Falls back to the first marketing user. */
export function authBypassEmail(): string | null {
  return process.env.AUTH_BYPASS_EMAIL?.trim() || null;
}

let warned = false;

/** Logs once per process so the mode is visible in deployment logs. */
export function warnBypassOnce(): void {
  if (warned) return;
  warned = true;
  console.warn(
    '[MT Proof Engine] AUTH_BYPASS is on. Sign-in is disabled and every ' +
      'request runs with full marketing privileges. Do not leave this set on ' +
      'anything holding real client data.'
  );
}
