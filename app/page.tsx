import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase-server';

export default async function RootPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const role = user.app_metadata?.role;
  if (role === 'admin') redirect('/admin');
  redirect('/dashboard');
}
