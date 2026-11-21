
/*
PANEL MIS RESERVAS

Mostramos las reservas del cliente.
Cada excursión tiene su propia tarjeta.

Separamos las reservas futuras y pasadas.
El cliente puede ver los detalles, solicitar
una cancelación y comunicarse con la agencia.

Si una salida fue suspendida, mostramos un aviso,
pero mantenemos el estado original de la reserva
para saber si estaba confirmada o pendiente de pago.
*/

import { useEffect, useMemo, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams
} from 'react-router-dom';

import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Users,
  MessageCircle,
  Clock3,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';

import { misOrdenes } from '../services/ordersService.js';
import ReservaChat from '../components/ReservaChat.jsx';
import api from '../services/api.js';

// Convertimos los estados en textos para el cliente.
const textoEstado = (estado) => ({
  PENDIENTE: 'Pendiente de pago',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
  REPROGRAMADA: 'Reprogramada'
}[String(estado || '').toUpperCase()] || estado || 'Pendiente');

// Mostramos las fechas con el formato argentino.
const fechaLegible = (fecha) =>
  fecha
    ? new Date(`${String(fecha).slice(0, 10)}T12:00:00`)
        .toLocaleDateString('es-AR')
    : 'Fecha por confirmar';

export default function MisPedidos() {

  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const compraDestino = params.get('compra');
  const detalleDestino = params.get('detalle');

  // Guardamos las compras y controlamos las tarjetas.
  const [compras, setCompras] = useState([]);
  const [pestania, setPestania] = useState('futuras');
  const [detalleAbierto, setDetalleAbierto] = useState(null);
  const [chatAbierto, setChatAbierto] = useState(null);

  // Estados para solicitar una cancelación.
  const [solicitarId, setSolicitarId] = useState(null);
  const [motivo, setMotivo] = useState('');

  // Controlamos los errores y la carga.
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  // Guardamos los avisos de éxito y error.
  const [aviso, setAviso] = useState(null);

  // Mostramos una notificación.
  const mostrarAviso = (texto, tipo = 'exito') => {
    setAviso({ texto, tipo });
  };

  // Cerramos automáticamente el aviso después de 5 segundos.
  useEffect(() => {
    if (!aviso) return;

    const tiempo = setTimeout(() => {
      setAviso(null);
    }, 5000);

    return () => clearTimeout(tiempo);
  }, [aviso]);

  // Mostramos el aviso cuando llegamos desde Checkout.
  useEffect(() => {

    if (!location.state?.ordenId) return;

    // La reserva se registró, pero todavía está pendiente de pago.
    mostrarAviso(
      '¡Tu solicitud de reserva se registró correctamente! ' +
      'Quedó pendiente de pago. Podés consultar los detalles aquí.',
      'exito'
    );

    // Limpiamos el mensaje de navegación para no repetirlo.
    navigate(
      location.pathname + location.search,
      {
        replace: true,
        state: null
      }
    );

  }, [
    location.state,
    location.pathname,
    location.search,
    navigate
  ]);

  // Enviamos una solicitud de cancelación al administrador.
  // Esto no cancela directamente la reserva.
  async function pedirCancelacion(id) {

    try {

      await api.post(
        `/api/hackathon/cliente/detalles/${id}/solicitar`,
        { motivo }
      );

      // Avisamos que la solicitud se envió correctamente.
      mostrarAviso(
        'Solicitud enviada correctamente. ' +
        'La empresa responderá por el chat.',
        'exito'
      );

      setSolicitarId(null);
      setMotivo('');

    } catch (e) {

      // Avisamos si hubo un error al enviar la solicitud.
      mostrarAviso(
        e.response?.data?.mensaje ||
        'No se pudo enviar la solicitud',
        'error'
      );
    }
  }

  // Cargamos las reservas cuando se abre la página.
  useEffect(() => {

    misOrdenes()
      .then(setCompras)
      .catch((e) => {

        const texto =
          e.response?.data?.mensaje ||
          'No pudimos cargar tus reservas.';

        setError(texto);
        mostrarAviso(texto, 'error');

      })
      .finally(() => setCargando(false));

  }, []);

  // Una compra puede tener varias excursiones.
  // Mostramos una tarjeta por cada DetalleCompra.
  const reservas = useMemo(() =>
    compras.flatMap((compra) =>
      (compra.detalles || []).map((detalle) => ({
        compra,
        detalle
      }))
    ), [compras]);

  // Obtenemos la fecha actual.
  const ahora = new Date();

  const hoy = `${ahora.getFullYear()}-${String(
    ahora.getMonth() + 1
  ).padStart(2, '0')}-${String(
    ahora.getDate()
  ).padStart(2, '0')}`;

  // Comprobamos si la fecha de la excursión ya pasó.
  const esPasada = ({ detalle }) => {

    const fecha =
      detalle.salida?.fecha ||
      detalle.excursion?.fecha;

    return fecha
      ? String(fecha).slice(0, 10) < hoy
      : false;
  };

  // Separamos las reservas según su fecha.
  const futuras = reservas.filter((r) => !esPasada(r));
  const pasadas = reservas.filter(esPasada);

  const visibles = pestania === 'futuras'
    ? futuras
    : pasadas;

  // Si el cliente entra desde un correo,
  // abrimos automáticamente la reserva correspondiente.
  useEffect(() => {

    if (
      !reservas.length ||
      (!compraDestino && !detalleDestino)
    ) return;

    const encontrada = reservas.find(({ compra, detalle }) =>
      detalleDestino
        ? String(detalle.id) === String(detalleDestino)
        : String(compra.id) === String(compraDestino)
    );

    if (!encontrada) return;

    setPestania(
      esPasada(encontrada) ? 'pasadas' : 'futuras'
    );

    setDetalleAbierto(encontrada.detalle.id);

    if (detalleDestino) {
      setChatAbierto(encontrada.detalle.id);
    }

  }, [reservas, compraDestino, detalleDestino]);

  return (
    <section className="mx-auto max-w-4xl space-y-5">

      {/* Título de la página */}
      <header>

        <p className="text-sm font-bold uppercase tracking-wider text-orange-600">
          Mi espacio de viajes
        </p>

        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
          Mis reservas
        </h1>

        <p className="mt-2 text-slate-600">
          Consultá las excursiones que vas a realizar
          y las que ya pasaron.
        </p>

      </header>

      {/* NOTIFICACIONES CON EL ESTILO DE DESCUBRE CÓRDOBA */}
      {/* Se muestran centradas, aunque estemos abajo de la página. */}
      {aviso && (
        <div
          role={aviso.tipo === 'error' ? 'alert' : 'status'}
          className="fixed left-1/2 top-24 z-9999 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-orange-500 bg-neutral-950 p-5 text-white shadow-2xl"
        >
          <div className="flex items-start gap-3">

            {/* Ícono según el resultado */}
            {aviso.tipo === 'error' ? (
              <AlertCircle
                size={24}
                className="shrink-0 text-orange-400"
              />
            ) : (
              <CheckCircle2
                size={24}
                className="shrink-0 text-orange-400"
              />
            )}

            {/* Texto del mensaje */}
            <div className="min-w-0 flex-1">

              <p className="font-bold text-orange-400">
                {aviso.tipo === 'error'
                  ? 'Atención'
                  : '¡Listo!'}
              </p>

              <p className="mt-1 wrap-break-word text-sm leading-6 text-white">
                {aviso.texto}
              </p>

            </div>

            {/* Botón naranja para cerrar */}
            <button
              type="button"
              onClick={() => setAviso(null)}
              aria-label="Cerrar aviso"
              className="shrink-0 rounded-lg bg-orange-500 p-2 text-white transition hover:bg-orange-600"
            >
              <X size={17} />
            </button>

          </div>
        </div>
      )}

      {/* Mensaje mientras cargamos las reservas */}
      {cargando && (
        <p className="text-slate-600">
          Cargando tus excursiones...
        </p>
      )}

      {/* Mostramos el listado cuando terminó de cargar */}
      {!cargando && !error && (
        <>

          {/* Pestañas de reservas futuras y pasadas */}
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filtrar excursiones"
          >

            <button
              type="button"
              onClick={() => setPestania('futuras')}
              aria-pressed={pestania === 'futuras'}
              className={`rounded-xl px-4 py-3 font-semibold ${
                pestania === 'futuras'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-slate-700 border'
              }`}
            >
              Futuras / vigentes ({futuras.length})
            </button>

            <button
              type="button"
              onClick={() => setPestania('pasadas')}
              aria-pressed={pestania === 'pasadas'}
              className={`rounded-xl px-4 py-3 font-semibold ${
                pestania === 'pasadas'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-slate-700 border'
              }`}
            >
              Pasadas ({pasadas.length})
            </button>

          </div>

          {/* Mensaje si no hay reservas en la pestaña */}
          {visibles.length === 0 && (
            <div className="rounded-2xl border bg-white p-7 text-center text-slate-600">

              No tenés excursiones en esta sección.{' '}

              <Link
                className="font-bold text-orange-600"
                to="/excursiones"
              >
                Explorar excursiones
              </Link>

            </div>
          )}

          {/* Mostramos cada reserva */}
          {visibles.map(({ compra, detalle }) => {

            const abierta = detalleAbierto === detalle.id;

            const fecha =
              detalle.salida?.fecha ||
              detalle.excursion?.fecha;

            // Comprobamos si el administrador suspendió la salida.
            const salidaCancelada =
              detalle.salida?.estadoSalida === 'CANCELADA';

            // Mantenemos el estado original de la reserva.
            // Esto permite saber si estaba confirmada o pendiente de pago.
            const estadoReserva =
              detalle.estado || compra.estado;

            // Comprobamos si la reserva está cancelada.
            const reservaCancelada =
              String(estadoReserva).toUpperCase() === 'CANCELADA';

            return (
              <article
                key={detalle.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm ${
                  String(detalle.id) === String(detalleDestino) ||
                  String(compra.id) === String(compraDestino)
                    ? 'border-orange-400 ring-2 ring-orange-100'
                    : 'border-slate-200'
                }`}
              >

                {/* Nombre, fecha y cantidad de pasajeros */}
                <div className="flex flex-wrap items-start justify-between gap-3">

                  <div>

                    <h2 className="text-xl font-extrabold text-slate-900">
                      {detalle.excursion?.nombre || 'Excursión reservada'}
                    </h2>

                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                      <CalendarDays size={16} />
                      {fechaLegible(fecha)}
                    </p>

                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                      <Users size={16} />
                      {detalle.cantidad} persona(s)
                    </p>

                  </div>

                  {/* Mostramos por separado la reserva y la salida */}
                  <div className="flex flex-col items-end gap-2">

                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        reservaCancelada
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      Reserva: {textoEstado(estadoReserva)}
                    </span>

                    {salidaCancelada && (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                        Salida suspendida
                      </span>
                    )}

                  </div>
                </div>

                {/* Botón para abrir o cerrar el detalle */}
                <button
                  type="button"
                  aria-expanded={abierta}
                  onClick={() =>
                    setDetalleAbierto(
                      abierta ? null : detalle.id
                    )
                  }
                  className="mt-4 flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  {abierta ? 'Ocultar detalle' : 'Ver detalle'}

                  {abierta
                    ? <ChevronUp size={17} />
                    : <ChevronDown size={17} />}
                </button>

                {/* Información de la excursión */}
                {abierta && (
                  <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">

                    <h3 className="font-bold text-slate-900">
                      Detalle de tu excursión
                    </h3>

                    {/* Avisamos si la salida fue suspendida */}
                    {salidaCancelada && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">

                        <p className="font-bold">
                          Esta salida fue suspendida por la agencia.
                        </p>

                        <p className="mt-2 text-sm">
                          {detalle.salida?.motivoSuspension ||
                            'Consultá los mensajes para conocer el motivo.'}
                        </p>

                        <p className="mt-2 text-sm">
                          Podés comunicarte con la agencia desde el chat
                          para coordinar un reintegro o una reprogramación.
                        </p>

                      </div>
                    )}

                    {/* Datos de la reserva */}
                    <p className="text-sm text-slate-700">
                      Salida: {fechaLegible(fecha)}
                    </p>

                    <p className="text-sm text-slate-700">
                      Pasajeros: {detalle.cantidad}
                    </p>

                    <p className="text-sm text-slate-700">
                      Precio por persona: ${Number(
                        detalle.precioUnitario || 0
                      ).toLocaleString('es-AR')}
                    </p>

                    <p className="text-sm text-slate-700">
                      Subtotal: ${Number(
                        detalle.subtotal ??
                        (
                          Number(detalle.precioUnitario || 0) *
                          Number(detalle.cantidad || 0)
                        )
                      ).toLocaleString('es-AR')}
                    </p>

                    {/* Conservamos el estado de la reserva */}
                    <p className="flex items-center gap-2 text-sm text-slate-700">
                      <Clock3 size={16} />
                      Estado de la reserva: {textoEstado(estadoReserva)}
                    </p>

                    {/* Mostramos también el estado de la salida */}
                    {salidaCancelada && (
                      <p className="text-sm font-semibold text-red-700">
                        Estado de la salida: Suspendida
                      </p>
                    )}

                    {/* Chat privado entre el cliente y la agencia */}
                    <button
                      type="button"
                      onClick={() =>
                        setChatAbierto(
                          chatAbierto === detalle.id
                            ? null
                            : detalle.id
                        )
                      }
                      className="flex items-center gap-2 rounded-xl border border-orange-600 px-4 py-2.5 text-sm font-bold text-orange-700"
                    >
                      <MessageCircle size={17} />

                      {chatAbierto === detalle.id
                        ? 'Cerrar conversación'
                        : 'Mensajes con la agencia'}
                    </button>

                    {/* No permitimos solicitar cancelación
                        si la reserva o la salida ya están canceladas */}
                    {!esPasada({ detalle }) &&
                      !reservaCancelada &&
                      !salidaCancelada && (

                        <button
                          type="button"
                          onClick={() => {
                            setSolicitarId(
                              solicitarId === detalle.id
                                ? null
                                : detalle.id
                            );
                          }}
                          className="rounded-xl border border-red-600 px-4 py-2 text-sm font-semibold text-red-700"
                        >
                          Solicitar cancelación
                        </button>
                      )}

                    {/* Formulario para solicitar la cancelación */}
                    {solicitarId === detalle.id &&
                      !esPasada({ detalle }) &&
                      !reservaCancelada &&
                      !salidaCancelada && (

                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            pedirCancelacion(detalle.id);
                          }}
                          className="space-y-2 rounded-xl border border-orange-200 bg-white p-3"
                        >

                          <label className="block text-sm font-semibold">
                            Motivo de la solicitud

                            <textarea
                              value={motivo}
                              onChange={(e) => setMotivo(e.target.value)}
                              minLength={10}
                              maxLength={2000}
                              required
                              className="mt-2 w-full rounded border p-2 text-slate-800"
                            />
                          </label>

                          <p className="text-xs text-slate-600">
                            Enviar la solicitud no cancela la reserva.
                            La agencia la evaluará.
                          </p>

                          <button className="rounded bg-orange-600 px-4 py-2 text-white">
                            Enviar solicitud
                          </button>

                        </form>
                      )}

                    {/* Mostramos el chat de esta reserva */}
                    {chatAbierto === detalle.id && (
                      <ReservaChat idDetalle={detalle.id} />
                    )}

                  </div>
                )}

              </article>
            );
          })}

        </>
      )}
    </section>
  );
}
