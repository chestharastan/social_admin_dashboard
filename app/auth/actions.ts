'use server';

export async function handleLoginAction(prevState: any, formData: FormData) {
  const email = formData.get('email');
  const password = formData.get('password');

  try {
    const res = await fetch(`${process.env.BACKEND_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.message || 'Authentication failed' };
    }

    // Success! Save your HTTP-only cookies/tokens here if needed
    return { success: true };
    
  } catch (err) {
    return { error: 'Something went wrong connection to the backend.' };
  }
}