'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Profile, UserRole } from '@/lib/types';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'contributor', label: 'Contributor' },
  { value: 'marketing', label: 'Marketing Owner' },
  { value: 'sales', label: 'Sales' },
  { value: 'leadership', label: 'Leadership' },
];

export function UserAdmin({ users, selfId }: { users: Profile[]; selfId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('contributor');
  const [message, setMessage] = useState<string | null>(null);

  async function setRole(userId: string, role: UserRole) {
    setBusy(userId);
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, role }),
    });
    setBusy(null);
    router.refresh();
  }

  async function invite() {
    setBusy('invite');
    setMessage(null);
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    setBusy(null);
    if (res.ok) {
      setMessage(`Invited ${inviteEmail}.`);
      setInviteEmail('');
      router.refresh();
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Invite failed' }));
      setMessage(error);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-end gap-2 border-2 border-mt-sand p-4">
        <div className="min-w-64 flex-1">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em]">Invite a teammate</p>
          <input
            type="email"
            className="mt-input py-2"
            placeholder="name@mineraltechnologies.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
        </div>
        <select className="border-2 border-mt-sand bg-white px-2 py-2.5 text-sm font-bold" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as UserRole)}>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <button type="button" className="mt-btn-red px-4 py-2.5 text-sm" disabled={busy !== null || !inviteEmail.includes('@')} onClick={invite}>
          {busy === 'invite' ? 'Inviting…' : 'Invite'}
        </button>
        {message && <p className="w-full text-sm font-bold">{message}</p>}
      </div>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b-2 border-mt-black-sand text-left">
            <th className="py-2 font-bold">Person</th>
            <th className="py-2 font-bold">Email</th>
            <th className="py-2 font-bold">Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-mt-sand">
              <td className="py-2 font-bold">{u.name ?? '—'}</td>
              <td className="py-2">{u.email}</td>
              <td className="py-2">
                <select
                  className="border-2 border-mt-sand bg-white px-2 py-1 font-bold"
                  value={u.role}
                  disabled={busy !== null || u.id === selfId}
                  onChange={(e) => setRole(u.id, e.target.value as UserRole)}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                {u.id === selfId && <span className="ml-2 text-xs text-mt-black-sand/50">you</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
