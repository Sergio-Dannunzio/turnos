import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase-server';
import Link from 'next/link';

export default async function RootPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const role = user.app_metadata?.role;
    if (role === 'admin') redirect('/admin');
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-bold text-xl text-gray-900">Turnixia</span>
          </div>
          <Link
            href="/login"
            className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-lg font-medium transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Gestión de turnos por WhatsApp con inteligencia artificial
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Tu negocio reserva turnos{' '}
            <span className="text-green-500">solo</span>
          </h1>
          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Un bot inteligente por WhatsApp que atiende a tus clientes, gestiona reservas
            y envía recordatorios automáticamente, sin que hagas nada.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg shadow-green-200"
            >
              Empezar ahora
            </Link>
            <a
              href="#como-funciona"
              className="text-gray-600 hover:text-gray-900 px-8 py-4 font-medium transition-colors"
            >
              Como funciona &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Todo lo que necesitas
          </h2>
          <p className="text-gray-500 text-center mb-16">
            Sin apps adicionales. Sin capacitacion. Funciona desde el primer dia.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                label: 'WA',
                color: 'bg-green-500',
                title: 'Bot por WhatsApp',
                desc: 'Tus clientes reservan, cancelan y consultan turnos desde WhatsApp, sin descargar nada nuevo.',
              },
              {
                label: 'IA',
                color: 'bg-blue-500',
                title: 'Inteligencia Artificial',
                desc: 'El bot entiende lenguaje natural. Tus clientes escriben como hablan y el sistema interpreta.',
              },
              {
                label: '24',
                color: 'bg-purple-500',
                title: 'Recordatorios automaticos',
                desc: '24 horas antes del turno, el bot manda un recordatorio. Menos ausencias, mas ingresos.',
              },
              {
                label: 'DB',
                color: 'bg-orange-500',
                title: 'Panel de control',
                desc: 'Ves todos los turnos del dia, historial de clientes y gestionas todo desde el dashboard.',
              },
              {
                label: 'HR',
                color: 'bg-pink-500',
                title: 'Horarios flexibles',
                desc: 'Configuras tus horarios disponibles con soporte para multiples franjas horarias por dia.',
              },
              {
                label: 'OK',
                color: 'bg-teal-500',
                title: 'Seguro y confiable',
                desc: 'Datos en la nube con acceso seguro. Tu informacion y la de tus clientes siempre protegida.',
              },
            ].map((f) => (
              <div key={f.title} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className={`w-10 h-10 ${f.color} rounded-lg flex items-center justify-center mb-4`}>
                  <span className="text-white font-bold text-xs">{f.label}</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Como funciona
          </h2>
          <p className="text-gray-500 text-center mb-16">
            En minutos tu negocio esta gestionando turnos automaticamente.
          </p>
          <div className="space-y-10">
            {[
              {
                step: '01',
                title: 'Configuras tus horarios',
                desc: 'Entras al dashboard y cargas los horarios disponibles de tu negocio. Una sola vez.',
              },
              {
                step: '02',
                title: 'Tus clientes escriben por WhatsApp',
                desc: 'El bot los atiende al instante, muestra los turnos disponibles y confirma la reserva.',
              },
              {
                step: '03',
                title: 'Todo queda registrado',
                desc: 'Ves el panel actualizado en tiempo real. 24hs antes del turno el bot manda el recordatorio.',
              },
            ].map((s) => (
              <div key={s.step} className="flex gap-6 items-start">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {s.step}
                </div>
                <div className="pt-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{s.title}</h3>
                  <p className="text-gray-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-green-500">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Listo para automatizar tu negocio?
          </h2>
          <p className="text-green-100 mb-8 text-lg">
            Empieza hoy y deja que Turnixia gestione los turnos por vos.
          </p>
          <Link
            href="/login"
            className="bg-white text-green-600 hover:bg-green-50 px-8 py-4 rounded-xl font-semibold text-lg transition-colors inline-block"
          >
            Crear cuenta gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-14 px-6 bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">T</span>
                </div>
                <span className="font-bold text-white">Turnixia</span>
              </div>
              <p className="text-sm max-w-xs leading-relaxed">
                Sistema de gestion de turnos para negocios con inteligencia artificial.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-4">Contacto</h4>
              <ul className="space-y-2 text-sm">
                <li>Tandil, Buenos Aires, Argentina</li>
                <li>
                  <a href="tel:+541152194829" className="hover:text-white transition-colors">
                    +54 11 5219 4829
                  </a>
                </li>
                <li>
                  <a href="mailto:admin@turnixia.com" className="hover:text-white transition-colors">
                    admin@turnixia.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-10 pt-8 text-sm text-center flex flex-col sm:flex-row items-center justify-center gap-4">
            <span>&copy; {new Date().getFullYear()} Turnixia. Todos los derechos reservados.</span>
            <Link href="/privacidad" className="hover:text-white transition-colors">
              Política de Privacidad
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
