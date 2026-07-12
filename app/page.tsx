import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AUTH_TOKEN_COOKIE } from '@/app/lib/auth';

export default async function Home() {
  const cookieStore = await cookies();

  if (cookieStore.has(AUTH_TOKEN_COOKIE)) {
    redirect('/dashboard');
  }

  redirect('/auth');
}
