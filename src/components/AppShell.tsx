import Link from 'next/link';
import type { Profile, UserRole } from '@/lib/types';
import { QuarterCircle } from '@/components/brand/QuarterCircle';

interface NavItem {
  href: string;
  label: string;
  roles: UserRole[];
}

const NAV: NavItem[] = [
  { href: '/capture', label: 'Tell a win', roles: ['contributor', 'marketing', 'sales', 'leadership'] },
  { href: '/my-stories', label: 'My stories', roles: ['contributor', 'marketing', 'sales', 'leadership'] },
  { href: '/review', label: 'Review queue', roles: ['marketing'] },
  { href: '/claims', label: 'Claims library', roles: ['marketing'] },
  { href: '/spin', label: 'SPIN questions', roles: ['marketing'] },
  { href: '/case-studies', label: 'Case studies', roles: ['marketing', 'sales', 'leadership', 'contributor'] },
  { href: '/library', label: 'Sales library', roles: ['marketing', 'sales', 'leadership'] },
  { href: '/dashboard', label: 'Dashboard', roles: ['marketing', 'leadership'] },
  { href: '/admin', label: 'Admin', roles: ['marketing'] },
];

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const items = NAV.filter((item) => item.roles.includes(profile.role));

  return (
    <div className="relative min-h-screen bg-white">
      <QuarterCircle />
      <header className="border-b-2 border-mt-black-sand bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 pr-20">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            MT <span className="text-mt-red-ore">Proof Engine</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-bold">
            {items.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-mt-red-ore">
                {item.label}
              </Link>
            ))}
          </nav>
          <form action="/auth/signout" method="post" className="ml-auto">
            <button className="text-xs font-bold uppercase tracking-[0.08em] text-mt-dust hover:text-mt-black-sand">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
