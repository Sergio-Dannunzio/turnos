import Link from 'next/link';

export const metadata = {
  title: 'Política de Privacidad — Turnixia',
  description: 'Política de privacidad de Turnixia, sistema de gestión de turnos por WhatsApp con inteligencia artificial.',
};

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Navbar */}
      <nav className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-bold text-xl text-gray-900">Turnixia</span>
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            &larr; Volver al inicio
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Política de Privacidad</h1>
        <p className="text-gray-500 mb-12">Última actualización: 17 de mayo de 2025</p>

        <div className="space-y-10 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Información general</h2>
            <p>
              Turnixia (en adelante "nosotros", "el Servicio") es un sistema de gestión de turnos
              que utiliza inteligencia artificial y la plataforma de WhatsApp Business para permitir
              a pequeños negocios recibir, gestionar y confirmar reservas de manera automatizada.
            </p>
            <p className="mt-3">
              El Servicio es operado por Sergio Dannunzio, con domicilio en Tandil, Buenos Aires,
              Argentina. Para cualquier consulta sobre esta política, podés contactarnos en{' '}
              <a href="mailto:admin@turnixia.com" className="text-green-600 hover:underline">
                admin@turnixia.com
              </a>{' '}
              o al +54 11 5219 4829.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Datos que recopilamos</h2>
            <p>Al utilizar el Servicio, recopilamos los siguientes datos:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                <span className="font-medium">Número de teléfono de WhatsApp:</span> utilizado para
                identificar al usuario e intercambiar mensajes.
              </li>
              <li>
                <span className="font-medium">Nombre:</span> proporcionado voluntariamente por el
                usuario al realizar una reserva.
              </li>
              <li>
                <span className="font-medium">Datos del turno:</span> fecha, hora y estado de la
                reserva (disponible, reservado, cancelado).
              </li>
              <li>
                <span className="font-medium">Historial de conversación:</span> los últimos mensajes
                intercambiados con el bot para mantener el contexto de la conversación.
              </li>
              <li>
                <span className="font-medium">Datos de cuenta (panel de administración):</span>{' '}
                correo electrónico y contraseña de los administradores del negocio.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Cómo usamos los datos</h2>
            <p>Los datos recopilados se utilizan exclusivamente para:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>Gestionar y confirmar reservas de turnos.</li>
              <li>Enviar recordatorios automáticos 24 horas antes del turno por WhatsApp.</li>
              <li>Mantener el historial de clientes para el negocio administrador.</li>
              <li>Interpretar los mensajes del usuario mediante inteligencia artificial para brindar respuestas en lenguaje natural.</li>
              <li>Permitir al negocio visualizar y gestionar sus turnos desde el panel de administración.</li>
            </ul>
            <p className="mt-3">
              No utilizamos los datos para fines publicitarios ni los vendemos a terceros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Terceros que procesan datos</h2>
            <p>Para operar el Servicio, compartimos datos con los siguientes proveedores:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                <span className="font-medium">Meta Platforms (WhatsApp Business API):</span> plataforma
                de mensajería utilizada para enviar y recibir mensajes de WhatsApp. Los mensajes son
                procesados conforme a las{' '}
                <a
                  href="https://www.whatsapp.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:underline"
                >
                  Políticas de Privacidad de WhatsApp
                </a>
                .
              </li>
              <li>
                <span className="font-medium">Anthropic (Claude AI):</span> proveedor de inteligencia
                artificial utilizado para interpretar los mensajes de los usuarios. Los mensajes son
                procesados de manera anónima y no se usan para entrenar modelos.
              </li>
              <li>
                <span className="font-medium">Supabase:</span> proveedor de base de datos en la nube
                donde se almacenan los datos de turnos, clientes y configuración del negocio. Los
                datos se almacenan en servidores seguros con cifrado en tránsito y en reposo.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Retención de datos</h2>
            <p>
              Los datos de reservas y clientes se conservan mientras el negocio mantenga activa
              su cuenta en Turnixia. El historial de conversación de WhatsApp se retiene de
              manera temporal (últimos 10 mensajes) únicamente para mantener el contexto de la
              conversación activa.
            </p>
            <p className="mt-3">
              Al cancelar la cuenta, los datos del negocio y sus clientes son eliminados de
              nuestra base de datos dentro de los 30 días posteriores a la baja.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Derechos del usuario</h2>
            <p>Los usuarios finales (clientes del negocio que interactúan por WhatsApp) tienen derecho a:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>Solicitar información sobre los datos almacenados relacionados a su número de teléfono.</li>
              <li>Solicitar la eliminación de sus datos de reservas e historial.</li>
              <li>Dejar de interactuar con el bot en cualquier momento sin consecuencias.</li>
            </ul>
            <p className="mt-3">
              Para ejercer estos derechos, el usuario puede contactarnos directamente por
              WhatsApp al +54 11 5219 4829 o por correo a{' '}
              <a href="mailto:admin@turnixia.com" className="text-green-600 hover:underline">
                admin@turnixia.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Seguridad</h2>
            <p>
              Implementamos medidas de seguridad razonables para proteger los datos almacenados,
              incluyendo cifrado en tránsito (HTTPS/TLS) y cifrado en reposo en nuestra base de
              datos. El acceso al panel de administración está protegido mediante autenticación
              con correo y contraseña.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Menores de edad</h2>
            <p>
              El Servicio no está dirigido a personas menores de 18 años. No recopilamos
              intencionalmente datos de menores.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Cambios en esta política</h2>
            <p>
              Podemos actualizar esta política de privacidad periódicamente. Cuando lo hagamos,
              actualizaremos la fecha al inicio de este documento. El uso continuado del Servicio
              tras los cambios implica la aceptación de la política actualizada.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contacto</h2>
            <p>Para consultas sobre esta política de privacidad:</p>
            <ul className="mt-3 space-y-1">
              <li><span className="font-medium">Responsable:</span> Sergio Dannunzio</li>
              <li><span className="font-medium">Negocio:</span> Turnixia</li>
              <li><span className="font-medium">Domicilio:</span> Tandil, Buenos Aires, Argentina</li>
              <li>
                <span className="font-medium">Email:</span>{' '}
                <a href="mailto:admin@turnixia.com" className="text-green-600 hover:underline">
                  admin@turnixia.com
                </a>
              </li>
              <li>
                <span className="font-medium">Teléfono:</span>{' '}
                <a href="tel:+541152194829" className="text-green-600 hover:underline">
                  +54 11 5219 4829
                </a>
              </li>
            </ul>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6 mt-16">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <span>&copy; {new Date().getFullYear()} Turnixia. Todos los derechos reservados.</span>
          <Link href="/" className="hover:text-gray-600 transition-colors">
            Volver al inicio
          </Link>
        </div>
      </footer>

    </div>
  );
}
