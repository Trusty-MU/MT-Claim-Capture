import { redirect } from 'next/navigation';
import { requireProfile, homeForRole } from '@/lib/auth';

export default async function Home() {
  const profile = await requireProfile();
  redirect(homeForRole(profile.role));
}
