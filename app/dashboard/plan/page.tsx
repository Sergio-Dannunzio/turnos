'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { Check, Zap, Shield, Clock, Loader2, MessageCircle } from 'lucide-react';

const SOPORTE_WP = process.env.NEXT_PUBLIC_SOPORTE_WP ?? '5492494018789';

function wpLink(plan: string) {
  const texto = encodeURIComponent(`Hola! Quiero activar el Plan ${plan} de Turnixia.`);
  return `https://wa.me/${SOPORTE_WP}?text=${texto}`;
}

type Plan = 'trial' | 'basico' | 'pro';

type Negocio = {
  plan: Plan;
  trial_inicio: string;
  plan_vence: string;
};

const PLANES = [
  {
    id: 'trial' as Plan,
    nombre: 'Trial',
    precio: null,
    descripcion: '7 días de prueba gratuita',
    color: 'zinc',
    features: [
      'Bot de WhatsApp (Sandbox)',
      'Dashboard completo',
      'Hasta 50 mensajes/día',
      'Llamadas ilimitadas',
    ],
    noFeatures: ['Número propio de WhatsApp', 'Recordatorios automáticos', 'Múltiples empleados'],
  },
  {
    id: 'basico' as Plan,
    nombre: 'Básico',
    precio: 40,
    descripcion: 'Para negocios que arrancan',
    color: 'blue',
    features: [
      'Bot de WhatsApp (número propio)',
      'Dashboard completo',
      'Mensajes ilimitados',
      'Llamadas ilimitadas',
    ],
    noFeatures: ['Recordatorios automáticos', 'Múltiples empleados'],
  },
  {
    id: 'pro' as Plan,
    nombre: 'Pro',
    precio: 60,
    descripcion: 'Para negocios en crecimiento',
    color: 'violet',
    features: [
      'Bot de WhatsApp (número propio)',
      'Dashboard completo',
      'Mensajes ilimitados',
      'Llamadas ilimitadas',
      'Recordatorios automáticos 24hs',
      'Múltiples empleados',
      'Soporte prioritario',
    ],
    noFeatures: [],
  },
];

function diasRestantes(vence: string) {
  const diff = new Date(vence).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function BadgePlan({ plan }: { plan: Plan }) {
  const styles: Record<Plan, string> = {
    trial: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    basico: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    pro: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  };
  const labels: Record<Plan, string> = { trial: 'Trial', basico: 'Básico', pro: 'Pro' };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${styles[plan]}`}>
      {labels[plan]}
    </span>
  );
}

export default function PlanPage() {
  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [loading, setLoading] = useState(true);
  const [suscribiendo, setSuscribiendo] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const supabase = createSupabaseBrowser();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('negocio_id').eq('id', user!.id).single();
      const { data } = await supabase
        .from('negocios')
        .select('plan, trial_inicio, plan_vence, mp_suscripcion_estado')
        .eq('id', profile!.negocio_id)
        .single();
      setNegocio(data);
      setLoading(false);
    }
    cargar();

    const pago = searchParams.get('pago');
    if (pago === 'ok') setMensaje({ tipo: 'ok', texto: '¡Pago recibido! Tu plan se activará en unos minutos.' });
    if (pago === 'error') setMensaje({ tipo: 'error', texto: 'El pago no pudo procesarse. Intentá de nuevo.' });
    if (pago === 'pendiente') setMensaje({ tipo: 'ok', texto: 'Pago pendiente de acreditación. Te avisaremos cuando se confirme.' });
  }, []);

  async function suscribirse(planId: string) {
    setSuscribiendo(planId);
    setMensaje(null);
    try {
      const res = await fetch('/api/suscripcion/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        setMensaje({ tipo: 'error', texto: 'Error al iniciar la suscripción. Intentá de nuevo.' });
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión. Intentá de nuevo.' });
    } finally {
      setSuscribiendo(null);
    }
  }

  async function cancelar() {
    if (!confirm('¿Seguro que no querés renovar? Tu plan seguirá activo hasta la fecha de vencimiento y no se cobrará nada más.')) return;
    setCancelando(true);
    setMensaje(null);
    try {
      const res = await fetch('/api/suscripcion/cancelar', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setMensaje({ tipo: 'ok', texto: 'Suscripción cancelada. Tu plan sigue activo hasta la fecha de vencimiento.' });
        setNegocio(prev => prev ? { ...prev, mp_suscripcion_estado: 'cancelada' } as any : prev);
      } else {
        setMensaje({ tipo: 'error', texto: 'Error al cancelar. Contactá soporte.' });
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión. Intentá de nuevo.' });
    } finally {
      setCancelando(false);
    }
  }

  const plan = (negocio?.plan ?? 'trial') as Plan;
  const mpEstado = (negocio as any)?.mp_suscripcion_estado ?? 'ninguna';
  const dias = negocio ? diasRestantes(negocio.plan_vence) : 0;
  const planActivo = PLANES.find(p => p.id === plan)!;
  const suscripcionActiva = mpEstado === 'activa';

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Plan y facturación</h1>
        <p className="text-sm text-zinc-500 mt-1">Administrá tu suscripción</p>
      </div>

      {/* Mensaje de feedback */}
      {mensaje && (
        <div className={`rounded-xl px-4 py-3 text-sm ${
          mensaje.tipo === 'ok'
            ? 'bg-green-500/10 border border-green-500/20 text-green-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {mensaje.texto}
        </div>
      )}

      {/* Estado actual */}
      {loading ? (
        <div className="h-28 bg-zinc-900 rounded-xl animate-pulse" />
      ) : (
        <div className={`rounded-xl border p-5 flex items-center justify-between gap-4 flex-wrap ${
          plan === 'trial'
            ? 'bg-amber-500/5 border-amber-500/20'
            : plan === 'basico'
            ? 'bg-blue-500/5 border-blue-500/20'
            : 'bg-violet-500/5 border-violet-500/20'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-lg ${
              plan === 'trial' ? 'bg-amber-500/15' : plan === 'basico' ? 'bg-blue-500/15' : 'bg-violet-500/15'
            }`}>
              {plan === 'trial' ? <Clock size={18} className="text-amber-400" /> :
               plan === 'basico' ? <Shield size={18} className="text-blue-400" /> :
               <Zap size={18} className="text-violet-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-white font-semibold">Plan activo</p>
                <BadgePlan plan={plan} />
              </div>
              {plan === 'trial' ? (
                <p className="text-sm text-zinc-400">
                  {dias > 0
                    ? <>Te quedan <span className="text-amber-400 font-semibold">{dias} día{dias !== 1 ? 's' : ''}</span> de prueba. Vence el {formatFecha(negocio!.plan_vence)}.</>
                    : 'Tu período de prueba venció. Actualizá tu plan para seguir usando el servicio.'}
                </p>
              ) : (
                <p className="text-sm text-zinc-400">
                  Plan <span className="text-white font-medium">{planActivo.nombre}</span> · ${planActivo.precio} USD/mes · Próxima renovación {formatFecha(negocio!.plan_vence)}
                </p>
              )}
            </div>
          </div>
          {plan === 'trial' && dias <= 3 && (
            <span className="text-xs font-medium bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg border border-amber-500/30">
              ⚠ Prueba por vencer
            </span>
          )}
        </div>
      )}

      {/* Aviso pagos por WhatsApp */}
      <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 flex items-start gap-3">
        <MessageCircle size={16} className="text-green-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm text-white font-medium">Los pagos se coordinan por WhatsApp</p>
          <p className="text-xs text-zinc-400 mt-0.5">Escribinos y activamos tu plan en minutos. Sin tarjeta ni trámites.</p>
        </div>
      </div>

      {/* Cards de planes */}
      <div>
        <p className="text-sm font-medium text-zinc-400 mb-4">Planes disponibles</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLANES.map((p) => {
            const activo = p.id === plan;
            const colorRing: Record<string, string> = {
              zinc: 'border-zinc-700',
              blue: 'border-blue-500/50',
              violet: 'border-violet-500/50',
            };
            const colorBg: Record<string, string> = {
              zinc: '',
              blue: activo ? 'bg-blue-500/5' : '',
              violet: activo ? 'bg-violet-500/5' : '',
            };
            const colorBtn: Record<string, string> = {
              zinc: 'bg-zinc-700 text-zinc-400 cursor-default',
              blue: activo
                ? 'bg-zinc-800 text-zinc-500 cursor-default'
                : 'bg-blue-600 hover:bg-blue-500 text-white cursor-not-allowed',
              violet: activo
                ? 'bg-zinc-800 text-zinc-500 cursor-default'
                : 'bg-violet-600 hover:bg-violet-500 text-white cursor-not-allowed',
            };

            return (
              <div
                key={p.id}
                className={`rounded-xl border p-5 flex flex-col gap-4 ${colorBg[p.color]} ${
                  activo ? colorRing[p.color] : 'border-zinc-800'
                }`}
              >
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white font-semibold">{p.nombre}</p>
                    {activo && <BadgePlan plan={p.id} />}
                  </div>
                  <p className="text-xs text-zinc-500">{p.descripcion}</p>
                </div>

                {/* Precio */}
                <div>
                  {p.precio ? (
                    <div className="flex flex-col gap-1">
                      {plan === 'trial' && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">
                            25% OFF primer mes
                          </span>
                        </div>
                      )}
                      <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-white">
                          ${plan === 'trial' ? Math.round(p.precio * 0.75) : p.precio}
                        </span>
                        <div className="flex flex-col mb-1">
                          {plan === 'trial' && (
                            <span className="text-xs text-zinc-600 line-through">${p.precio}</span>
                          )}
                          <span className="text-zinc-500 text-xs">USD/mes</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-3xl font-bold text-white">Gratis</span>
                  )}
                </div>

                {/* Features */}
                <ul className="flex flex-col gap-2 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-zinc-300">
                      <Check size={13} className="text-green-400 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                  {p.noFeatures.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-zinc-600 line-through">
                      <Check size={13} className="text-zinc-700 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {activo && suscripcionActiva ? (
                  <button
                    onClick={cancelar}
                    disabled={cancelando}
                    className="w-full py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
                  >
                    {cancelando && <Loader2 size={13} className="animate-spin" />}
                    No renovar
                  </button>
                ) : activo ? (
                  <button disabled className="w-full py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-500 cursor-default">
                    Plan actual
                  </button>
                ) : p.id === 'trial' ? (
                  <button disabled className="w-full py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-600 cursor-default">
                    —
                  </button>
                ) : (
                  <a
                    href={wpLink(p.nombre)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      p.id === 'basico'
                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                        : 'bg-violet-600 hover:bg-violet-500 text-white'
                    }`}
                  >
                    <MessageCircle size={13} />
                    Activar por WhatsApp
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-zinc-600">
        ¿Dudas? Escribinos a <span className="text-zinc-500">soporte@turnixia.com</span> o por WhatsApp al mismo número de soporte.
      </p>
    </div>
  );
}
