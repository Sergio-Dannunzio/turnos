'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Ban, Users, Settings, LogOut, LayoutDashboard, CalendarCheck, Clock, MessageSquare, Zap, Menu, X } from 'lucide-react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

const links = [
  { href: '/dashboard', label: 'Agenda', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/turnos', label: 'Turnos', icon: CalendarCheck },
  { href: '/dashboard/bloqueos', label: 'Bloqueos', icon: Ban },
  { href: '/dashboard/chats', label: 'Chats', icon: MessageSquare },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/horarios', label: 'Horarios', icon: Clock },
  { href: '/dashboard/plan', label: 'Plan', icon: Zap },
  { href: '/dashboard/configuracion', label: 'Configuración', icon: Settings },
];

export default function Sidebar({ negocioNombre }: { negocioNombre: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <>
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-52 shrink-0 h-screen sticky top-0 bg-black border-r border-zinc-900 flex-col">
        <div className="px-4 py-5 border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-white font-bold">
              {negocioNombre.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-white truncate">{negocioNombre}</span>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
          {links.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
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

      {/* Topbar — mobile */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-black border-b border-zinc-900 flex items-center justify-between px-4 h-14">
        <span className="text-sm font-semibold text-white">Turnixia</span>
        <button
          onClick={() => setOpen(v => !v)}
          className="p-2 text-zinc-400 hover:text-white transition-colors"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Drawer — mobile */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />

          {/* Panel */}
          <aside className="relative z-10 w-64 h-full bg-zinc-950 border-r border-zinc-900 flex flex-col">
            <div className="px-4 py-5 border-b border-zinc-900">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-white font-bold">
                  {negocioNombre.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-white truncate">{negocioNombre}</span>
              </div>
            </div>

            <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
              {links.map(({ href, label, icon: Icon, exact }) => {
                const active = exact ? pathname === href : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      active ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    <Icon size={16} strokeWidth={1.8} />
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="px-2 py-3 border-t border-zinc-900">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
              >
                <LogOut size={16} strokeWidth={1.8} />
                Cerrar sesión
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
