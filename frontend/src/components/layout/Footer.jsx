
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Instagram, MessageCircle, Mail, MapPin, Phone } from 'lucide-react';

function Footer() {

  // Guardamos los datos de contacto de la empresa.
  const [contactos, setContactos] = useState({
    whatsapp: '3546571278',
    email: 'descubrecordoba2000@gmail.com'
  });

  // Instagram de Descubre Córdoba.
  const instagram = 'descubre.cordoba';

  // Buscamos los datos de contacto guardados en el backend.
  useEffect(() => {
    fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/empresa/contacto`
    )
      .then((respuesta) => respuesta.json())
      .then((respuesta) => {
        if (respuesta?.data) {
          setContactos({
            whatsapp: respuesta.data.whatsapp || '',
            email: respuesta.data.email || ''
          });
        }
      })
      .catch((error) => {
        console.error('Error al cargar contactos:', error);
      });
  }, []);

  // Preparamos el número para utilizarlo en WhatsApp.
  const numeroContacto = String(contactos.whatsapp || '').replace(/\D/g, '');

  // Agregamos el código de Argentina si el número tiene 10 dígitos.
  const whatsapp = numeroContacto.length === 10
    ? `549${numeroContacto}`
    : numeroContacto;

  const email = contactos.email;

  // Mensaje que se completa al abrir WhatsApp.
  const mensaje = encodeURIComponent(
    '¡Hola! Quisiera consultar sobre las excursiones de Descubre Córdoba.'
  );

  // Enlace de WhatsApp.
  const linkWhatsApp = whatsapp
    ? `https://wa.me/${whatsapp}?text=${mensaje}`
    : null;

  // Enlace de Instagram.
  const linkInstagram = instagram
    ? `https://www.instagram.com/${instagram}/`
    : null;

  return (
    <footer
      id="contacto"
      className="mt-auto bg-neutral-950 text-white"
    >

      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-3 lg:py-16">

        {/* Información principal de Descubre Córdoba */}
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            DESCUBRE{' '}
            <span className="text-orange-500">CÓRDOBA</span>
          </h2>

          <p className="mt-4 max-w-sm text-sm leading-7 text-neutral-400">
            Descubrí paisajes increíbles, experiencias únicas
            y aventuras inolvidables en Córdoba.
            Tu próximo viaje comienza acá.
          </p>

          <div className="mt-5 flex items-center gap-2 text-sm text-neutral-400">
            <MapPin size={17} className="text-orange-500" />
            Córdoba, Argentina
          </div>
        </div>

        {/* Enlaces de navegación */}
        <div>
          <h3 className="text-base font-semibold">
            Explorar
          </h3>

          <nav className="mt-5 flex flex-col items-start gap-3 text-sm text-neutral-400">

            <Link to="/" className="hover:text-orange-400">
              Inicio
            </Link>

            <Link to="/excursiones" className="hover:text-orange-400">
              Excursiones
            </Link>

            <a
              href="/#preguntas-frecuentes"
              className="hover:text-orange-400"
            >
              Preguntas frecuentes
            </a>

            <Link to="/registro" className="hover:text-orange-400">
              Crear mi cuenta
            </Link>

          </nav>
        </div>

        {/* Información y botones de contacto */}
        <div>
          <h3 className="text-base font-semibold">
            ¿Necesitás ayuda?
          </h3>

          <p className="mt-4 text-sm leading-6 text-neutral-400">
            Contactanos para consultar sobre excursiones,
            fechas disponibles y reservas.
          </p>

          <div className="mt-5 space-y-4">

            {/* Mostramos el teléfono de contacto */}
            {contactos.whatsapp && (
              <div className="flex items-center gap-3 text-sm">
                <Phone
                  size={18}
                  className="shrink-0 text-orange-500"
                />

                <div>
                  <p className="text-neutral-400">
                    Teléfono de contacto
                  </p>

                  <p className="font-semibold text-white">
                    {contactos.whatsapp}
                  </p>
                </div>
              </div>
            )}

            {/* Mostramos el correo para que el usuario pueda copiarlo */}
            {email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail
                  size={18}
                  className="shrink-0 text-orange-500"
                />

                <div className="min-w-0">
                  <p className="text-neutral-400">
                    Correo electrónico
                  </p>

                  <p className="break-all font-semibold text-white">
                    {email}
                  </p>
                </div>
              </div>
            )}

            {/* Botones de WhatsApp e Instagram */}
            <div className="flex flex-wrap gap-3 pt-2">

              {/* Abrimos WhatsApp con un mensaje preparado */}
              {linkWhatsApp && (
                <a
                  href={linkWhatsApp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
                >
                  <MessageCircle size={18} />
                  WhatsApp
                </a>
              )}

              {/* Abrimos Instagram en otra pestaña */}
              {linkInstagram && (
                <a
                  href={linkInstagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-neutral-600 px-4 py-3 text-sm font-semibold transition hover:border-orange-400 hover:text-orange-400"
                >
                  <Instagram size={18} />
                  Instagram
                </a>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Información inferior de la página */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-6 text-center text-xs text-neutral-500 sm:px-8 md:flex-row">

          <p>
            © {new Date().getFullYear()} Descubre Córdoba.
            Todos los derechos reservados.
          </p>

          <p>
            Naturaleza · Aventura · Experiencias
          </p>

        </div>
      </div>

    </footer>
  );
}

export default Footer;
