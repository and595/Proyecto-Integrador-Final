import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { listarExcursionesPublicas } from '../services/excursionesService.js';

import cordoba1 from '../assets/img/Cordoba1.png';
import cordoba2 from '../assets/img/cordoba2.png';
import cordoba3 from '../assets/img/cordoba3.png';

const imagenes = [cordoba1, cordoba2, cordoba3];

const preguntasFrecuentes = [
  ['¿Cómo reservo una excursión?', 'Elegí una excursión, seleccioná una fecha disponible y la cantidad de personas. Revisá los detalles y confirmá tu solicitud de reserva.'],
  ['¿Cómo puedo pagar?', 'Las formas de pago online estarán disponibles próximamente. Una solicitud registrada no significa que esté pagada. Podés consultar su estado en Mis reservas.'],
  ['¿Cómo sé si mi reserva está confirmada?', 'En Mis reservas podés consultar el estado actualizado. Una solicitud pendiente de pago todavía no es una reserva pagada.'],
  ['¿Recibiré un correo electrónico?', 'Si el servicio de correo está habilitado, recibirás los detalles y las condiciones de la reserva. También podés consultarla desde tu perfil.'],
  ['¿Qué pasa si se suspende una excursión?', 'El organizador informará las opciones de reprogramación o devolución que correspondan según las condiciones comunicadas y la normativa aplicable.'],
  ['¿Puedo cancelar mi reserva?', 'Consultá las condiciones de cada excursión antes de confirmar. Se respetarán los derechos que correspondan al consumidor.'],
];

// Las fotos del administrador se guardan como rutas de Multer o JSON.
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:3000')
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '');

function obtenerImagen(valor) {
  if (!valor) return null;
  if (Array.isArray(valor)) return obtenerImagen(valor[0]);

  if (typeof valor === 'object') {
    return obtenerImagen(
      valor.url || valor.ruta || valor.path || valor.src || valor.imagen
    );
  }

  if (typeof valor !== 'string') return null;
  const ruta = valor.trim();
  if (!ruta) return null;

  if (ruta.startsWith('{') || ruta.startsWith('[')) {
    try { return obtenerImagen(JSON.parse(ruta)); }
    catch { return null; }
  }

  if (/^(https?:\/\/|data:image\/|blob:)/i.test(ruta)) return ruta;
  if (ruta.startsWith('//')) return `${window.location.protocol}${ruta}`;

  // Rutas de Multer: /uploads/foto.jpg o uploads/foto.jpg
  return `${API_ORIGIN}/${ruta.replace(/^\/+/, '')}`;
}

function ImagenExcursion({ imagen, nombre }) {
  const [fallo, setFallo] = useState(false);
  const url = obtenerImagen(imagen);

  useEffect(() => { setFallo(false); }, [url]);

  return (
    <img
      src={!fallo && url ? url : cordoba2}
      alt={nombre}
      loading="lazy"
      onError={() => setFallo(true)}
      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
    />
  );
}

function Inicio() {
  const { usuario } = useAuth();
  const [indiceActual, setIndiceActual] = useState(0);
  const [destacadas, setDestacadas] = useState([]);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setIndiceActual((actual) => (actual + 1) % imagenes.length);
    }, 5000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    let activo = true;
    listarExcursionesPublicas()
      .then((respuesta) => {
        if (!activo) return;
        const lista = Array.isArray(respuesta)
          ? respuesta
          : respuesta?.excursiones || respuesta?.data?.excursiones || respuesta?.data || [];
        setDestacadas(Array.isArray(lista) ? lista.slice(0, 3) : []);
      })
      .catch((error) => console.error('No se pudieron cargar excursiones:', error));
    return () => { activo = false; };
  }, []);

  return (
    <main className="w-full min-w-0 bg-white text-slate-900">
      {/* BANNER PRINCIPAL: ancho completo, menos altura y texto más liviano */}
<section className="relative left-1/2 h-105 w-screen max-w-none -translate-x-1/2 overflow-hidden bg-slate-950 sm:h-115 lg:h-125">        {imagenes.map((imagen, indice) => (
          <img
            key={imagen}
            src={imagen}
            alt={indice === indiceActual ? 'Paisaje de las sierras de Córdoba' : ''}
            aria-hidden={indice !== indiceActual}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${indice === indiceActual ? 'opacity-100' : 'opacity-0'}`}
          />
        ))}
        <div className="absolute inset-0 bg-linear-to-r from-black/80 via-black/45 to-black/15" />
        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-5 py-12 sm:px-8 lg:px-12">
          <div className="max-w-2xl text-white">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-300 sm:text-xs">
              Naturaleza · aventura · experiencias
            </p>
            <h1 className="text-[clamp(2.5rem,5vw,4.4rem)] font-semibold leading-[1.08] tracking-[-0.035em]">
              Descubrí Córdoba
              <span className="block text-orange-400">a tu manera.</span>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-6 text-white/90 sm:text-base sm:leading-7">
              Paisajes que sorprenden, lugares para descubrir y experiencias para recordar.
              Elegí tu próxima escapada.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/excursiones" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600">
                Explorar excursiones <span className="ml-2" aria-hidden="true">→</span>
              </Link>
              {!usuario && (
                <Link to="/registro" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/60 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-slate-900">
                  Crear mi cuenta
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {imagenes.map((_, indice) => (
            <button
              key={indice}
              type="button"
              onClick={() => setIndiceActual(indice)}
              aria-label={`Mostrar paisaje ${indice + 1}`}
              aria-current={indice === indiceActual ? 'true' : undefined}
              className={`h-2 rounded-full transition-all ${indice === indiceActual ? 'w-7 bg-orange-400' : 'w-2 bg-white/60 hover:bg-white'}`}
            />
          ))}
        </div>
      </section>

      {/* BIENVENIDA: solo para clientes autenticados */}
      {usuario && (
        <section className="bg-orange-50 px-5 py-9 sm:px-8">
          <div className="mx-auto flex max-w-6xl flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-700">Tu espacio de viajes</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                ¡Hola, {usuario.nombre || 'viajero/a'}! 👋
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                Qué bueno tenerte por acá. ¿Planeamos tu próxima aventura?
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/perfil" className="rounded-lg border border-orange-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-orange-100">Mi cuenta</Link>
              <Link to="/mis-pedidos" className="rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600">Mis reservas</Link>
            </div>
          </div>
        </section>
      )}

      {/* RECOMENDACIONES: datos reales recuperados del backend */}
      <section className="px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-600">Explorá nuevos lugares</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Excursiones que te van a encantar</h2>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">Encontrá tu próxima experiencia en Córdoba.</p>
            </div>
            <Link to="/excursiones" className="text-sm font-semibold text-orange-700 hover:text-orange-900">Ver todas las excursiones →</Link>
          </div>
          {destacadas.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {destacadas.map((excursion) => (
                <Link key={excursion.id} to={`/excursiones/${excursion.id}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="relative h-48 overflow-hidden bg-slate-100">
                    <ImagenExcursion imagen={excursion.imagen} nombre={excursion.nombre} />
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-slate-900">{excursion.nombre}</h3>
                    <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600">{excursion.descripcion}</p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                      <span className="text-xs text-slate-500">{excursion.duracion ? `${excursion.duracion} horas` : 'Descubrí la experiencia'}</span>
                      <span className="text-sm font-semibold text-orange-700">Ver detalles →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">Todavía no hay excursiones disponibles para recomendar.</div>
          )}
        </div>
      </section>

      {/* PASOS PARA RESERVAR */}
      <section className="bg-slate-50 px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-600">Planificá tu aventura</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Tu próximo viaje, en tres pasos</h2>
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              ['01', 'Descubrí', 'Explorá excursiones y conocé todos sus detalles.'],
              ['02', 'Elegí tu fecha', 'Consultá las próximas salidas y los lugares disponibles.'],
              ['03', 'Solicitá tu reserva', 'Revisá los datos y confirmá tu solicitud.'],
            ].map(([numero, titulo, texto]) => (
              <article key={numero} className="rounded-2xl border border-slate-200 bg-white p-6">
                <span className="text-2xl font-semibold text-orange-500">{numero}</span>
                <h3 className="mt-3 text-lg font-semibold">{titulo}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PREGUNTAS FRECUENTES */}
      <section id="preguntas-frecuentes" className="bg-white px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-600">Te acompañamos</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Preguntas frecuentes</h2>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">Todo lo que necesitás saber antes de reservar.</p>
          <div className="mt-7 space-y-3">
            {preguntasFrecuentes.map(([pregunta, respuesta]) => (
              <details key={pregunta} className="group rounded-xl border border-slate-200 bg-white p-5 open:border-orange-200 open:bg-orange-50/40">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                  {pregunta}
                  <span className="shrink-0 text-xl font-normal text-orange-600 group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-600">{respuesta}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default Inicio;
