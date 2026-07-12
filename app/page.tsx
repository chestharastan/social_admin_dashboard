// app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  // Automatically sends users to your login screen
  redirect('/auth');
}