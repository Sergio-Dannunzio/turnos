'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, LogOut, MessageSquare, Zap, BarChart2 } from 'lucide-react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

const links = [
  { href: '/admin', label: 'Negocios', icon: Building2, exact: true },
  { href: '/admin/whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { href: '/admin/planes', label: 'Planes', icon: Zap },
  { href: '/admin/tokens', label: 'Tokens', icon: BarChart2 },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <aside className="w-52 shrink-0 h-screen sticky top-0 bg-black border-r border-zinc-900 flex flex-col">
      <div className="px-4 py-5 border-b border-zinc-900">
        <span className="text-sm font-semibold text-white">Admin</span>
      </div>

      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Icon size={15} strokeWidth={1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 py-3 border-t border-zinc-900">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
        >
          <LogOut size={15} strokeWidth={1.8} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
