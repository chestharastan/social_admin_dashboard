import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AUTH_TOKEN_COOKIE } from '@/app/lib/auth';
import LoginForm from '@/components/auth/login';

export default async function AuthPage() {
  const cookieStore = await cookies();

  if (cookieStore.has(AUTH_TOKEN_COOKIE)) {
    redirect('/dashboard');
  }

  return (
    <main>
      <LoginForm />
    </main>
  );
}
