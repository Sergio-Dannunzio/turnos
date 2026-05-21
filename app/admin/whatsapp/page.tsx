'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

type Negocio = { id: number; nombre: string; email: string; meta_phone_number_id?: string; meta_access_token?: string };

type CredsState = {
  phoneNumberId: string;
  accessToken: string;
  demoTelefono: string;
  tokenConfigured: boolean;
  loading: boolean;
  success: string;
  error: string;
  renovando: boolean;
};

const defaultCreds = (): CredsState => ({
  phoneNumberId: '', accessToken: '', demoTelefono: '', tokenConfigured: false,
  loading: false, success: '', error: '', renovando: false,
});

export default function AdminWhatsappPage() {
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [creds, setCreds] = useState<Record<number, CredsState>>({});
  const [expandido, setExpandido] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/admin/negocios')
      .then(r => r.json())
      .then(data => setNegocios(data.negocios ?? []))
      .catch(() => {});
  }, []);

  async function cargarCreds(negocioId: number) {
    if (creds[negocioId]) return;
    const res = await fetch(`/api/admin/whatsapp?negocioId=${negocioId}`);
    const data = await res.json();
    setCreds(prev => ({
      ...prev,
      [negocioId]: { ...defaultCreds(), phoneNumberId: data.phoneNumberId ?? '', demoTelefono: data.demoTelefono ?? '', tokenConfigured: data.tokenConfigured ?? false },
    }));
  }

  function toggleExpand(id: number) {
    if (expandido === id) { setExpandido(null); return; }
    setExpandido(id);
    cargarCreds(id);
  }

  function update(negocioId: number, patch: Partial<CredsState>) {
    setCreds(prev => ({ ...prev, [negocioId]: { ...prev[negocioId], ...patch } }));
  }

  async function guardar(negocioId: number) {
    const c = creds[negocioId];
    update(negocioId, { loading: true, success: '', error: '' });
    const res = await fetch('/api/admin/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ negocioId, phoneNumberId: c.phoneNumberId, accessToken: c.accessToken || undefined, demoTelefono: c.demoTelefono }),
    });
    const data = await res.json();
    if (!res.ok) { update(negocioId, { loading: false, error: data.error ?? 'Error al guardar' }); return; }
    update(negocioId, { loading: false, success: 'Guardado.', accessToken: '', tokenConfigured: c.accessToken ? true : c.tokenConfigured });
    setTimeout(() => update(negocioId, { success: '' }), 3000);
  }

  async function copiarDePrincipal(negocioId: number) {
    update(negocioId, { loading: true, error: '', success: '' });
    const res = await fetch(`/api/admin/whatsapp?action=copiar-principal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ negocioId }),
    });
    const data = await res.json();
    if (!res.ok) { update(negocioId, { loading: false, error: data.error ?? 'Error al copiar' }); return; }
    update(negocioId, { loading: false, success: 'Credenciales copiadas del negocio principal.', tokenConfigured: true });
    setTimeout(() => update(negocioId, { success: '' }), 3000);
  }

  async function renovar(negocioId: number) {
    const c = creds[negocioId];
    if (!c.accessToken) { update(negocioId, { error: 'Pegá el token antes de renovar.' }); return; }
    update(negocioId, { renovando: true, error: '', success: '' });
    const res = await fetch('/api/admin/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ negocioId, accessToken: c.accessToken, renovar: true }),
    });
    const data = await res.json();
    if (!res.ok) { update(negocioId, { renovando: false, error: data.error ?? 'Error al renovar' }); return; }
    update(negocioId, { renovando: false, success: `Token renovado. Válido por ${data.expiresInDays} días.`, accessToken: '', tokenConfigured: true });
    setTimeout(() => update(negocioId, { success: '' }), 5000);
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Conexión WhatsApp</h1>
        <p className="text-sm text-zinc-500">Configurá las credenciales de Meta por negocio.</p>
      </div>

      {negocios.length === 0 && (
        <p className="text-zinc-600 text-sm text-center py-16">No hay negocios creados.</p>
      )}

      {negocios.map(n => {
        const c = creds[n.id] ?? defaultCreds();
        const open = expandido === n.id;

        return (
          <div key={n.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleExpand(n.id)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-800/50 transition-colors"
            >
              <div>
                <p className="font-semibold text-white">{n.nombre}</p>
                <p className="text-xs text-zinc-500">{n.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {creds[n.id] ? (
                  creds[n.id].tokenConfigured
                    ? <span className="flex items-center gap-1.5 text-xs text-green-400"><CheckCircle size={13} /> Conectado</span>
                    : <span className="flex items-center gap-1.5 text-xs text-zinc-500"><XCircle size={13} /> Sin configurar</span>
                ) : null}
                <span className="text-zinc-600 text-xs">{open ? '▲' : '▼'}</span>
              </div>
            </button>

            {open && (
              <div className="border-t border-zinc-800 px-5 py-5 flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Phone Number ID</label>
                  <input
                    type="text"
                    value={c.phoneNumberId}
                    onChange={e => update(n.id, { phoneNumberId: e.target.value })}
                    placeholder="Ej: 1065428559998039"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 placeholder-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Teléfono demo</label>
                  <input
                    type="text"
                    value={c.demoTelefono}
                    onChange={e => update(n.id, { demoTelefono: e.target.value })}
                    placeholder="Ej: 5491123456789"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 placeholder-zinc-600"
                  />
                  <p className="text-xs text-zinc-600 mt-1">Teléfono del dueño. Los mensajes desde este número se rutean a este negocio.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Token de acceso
                    {c.tokenConfigured && <span className="ml-2 text-xs text-green-500">● Configurado</span>}
                  </label>
                  <input
                    type="password"
                    value={c.accessToken}
                    onChange={e => update(n.id, { accessToken: e.target.value })}
                    placeholder={c.tokenConfigured ? 'Pegá un nuevo token para reemplazarlo' : 'Pegá el token de Meta acá'}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 placeholder-zinc-600"
                  />
                  <p className="text-xs text-zinc-600 mt-1">Token temporal: 24hs. Usá "Renovar a 60 días" para extenderlo.</p>
                </div>

                <button
                  type="button"
                  onClick={() => copiarDePrincipal(n.id)}
                  disabled={c.loading}
                  className="w-full border border-dashed border-zinc-700 text-zinc-500 rounded-lg py-2 text-sm hover:border-zinc-500 hover:text-zinc-300 disabled:opacity-40 transition-colors"
                >
                  Copiar credenciales del negocio principal
                </button>

                {c.error && <p className="text-red-400 text-sm">{c.error}</p>}
                {c.success && <p className="text-green-400 text-sm">{c.success}</p>}

                <div className="flex gap-2">
                  <button
                    onClick={() => renovar(n.id)}
                    disabled={c.renovando || !c.accessToken}
                    className="flex-1 border border-zinc-700 text-zinc-300 rounded-lg py-2 text-sm font-medium hover:bg-zinc-800 disabled:opacity-40 transition-colors"
                  >
                    {c.renovando ? 'Renovando...' : 'Renovar a 60 días'}
                  </button>
                  <button
                    onClick={() => guardar(n.id)}
                    disabled={c.loading}
                    className="flex-1 bg-white text-zinc-900 rounded-lg py-2 text-sm font-semibold hover:bg-zinc-200 disabled:opacity-50 transition-colors"
                  >
                    {c.loading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
