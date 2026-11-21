
// HACKATHON GRUPO 9 - COMPONENTE DE CHAT REUTILIZABLE
// Se utiliza en el panel del cliente y del administrador.
// useState guarda los mensajes, el texto y las notificaciones.
// useEffect carga la conversación cuando se abre.
// El chat se actualiza manualmente, sin WebSockets.

import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';

import api from '../services/api.js';
import { adminApi } from '../services/adminApi.js';

export default function ReservaChat({ idDetalle, esAdmin = false }) {

  // Guardamos los mensajes de la conversación.
  const [mensajes, setMensajes] = useState([]);

  // Guardamos el texto que escribe el usuario.
  const [contenido, setContenido] = useState('');

  // Controlamos si se está enviando un mensaje.
  const [cargando, setCargando] = useState(false);

  // Guardamos las notificaciones de éxito y error.
  const [aviso, setAviso] = useState(null);

  // Usamos la API correspondiente según quién esté escribiendo.
  const cliente = esAdmin ? adminApi : api;

  const url = `/api/mensajes/${
    esAdmin ? 'admin' : 'cliente'
  }/${idDetalle}`;

  // Mostramos una notificación en pantalla.
  const mostrarAviso = (texto, tipo = 'exito') => {
    setAviso({ texto, tipo });
  };

  // Cerramos el aviso automáticamente después de 5 segundos.
  useEffect(() => {
    if (!aviso) return;

    const tiempo = setTimeout(() => {
      setAviso(null);
    }, 5000);

    return () => clearTimeout(tiempo);

  }, [aviso]);

  // Consultamos los mensajes guardados en el backend.
  async function actualizar() {

    try {

      const r = await cliente.get(url);

      // adminApi devuelve los datos directamente.
      // api devuelve el objeto response con sus datos.
      const datos = esAdmin ? r : r.data;

      setMensajes(datos.mensajes || []);

      return true;

    } catch (e) {

      mostrarAviso(
        e.response?.data?.mensaje ||
        e.message ||
        'Error al cargar los mensajes',
        'error'
      );

      return false;
    }
  }

  // Cargamos la conversación cuando se abre.
  useEffect(() => {
    if (idDetalle) {
      actualizar();
    }
  }, [idDetalle, esAdmin]);

  // Enviamos un mensaje a la agencia o al cliente.
  async function enviar(e) {

    e.preventDefault();

    // Evitamos enviar mensajes vacíos o duplicados.
    if (!contenido.trim() || cargando) return;

    setCargando(true);

    try {

      // Guardamos el mensaje en el backend.
      await cliente.post(url, {
        contenido: contenido.trim()
      });

      // Limpiamos el campo después del envío.
      setContenido('');

      // Actualizamos la conversación.
      const actualizado = await actualizar();

      // Si también pudimos actualizar, mostramos el éxito.
      if (actualizado) {
        mostrarAviso(
          esAdmin
            ? 'Mensaje enviado correctamente al cliente.'
            : 'Mensaje enviado correctamente a la agencia.',
          'exito'
        );
      }

    } catch (e) {

      // Avisamos si el mensaje no se pudo enviar.
      mostrarAviso(
        e.response?.data?.mensaje ||
        e.message ||
        'No se pudo enviar el mensaje.',
        'error'
      );

    } finally {
      setCargando(false);
    }
  }

  return (
    <section
      className={`rounded-xl border p-3 ${
        esAdmin
          ? 'border-slate-600 bg-slate-800 text-white'
          : 'border-slate-200 bg-white text-slate-900'
      }`}
    >

      {/* Encabezado del chat */}
      <div className="mb-3 flex items-center justify-between gap-2">

        <h4 className="font-bold">
          Conversación privada
        </h4>

        {/* Volvemos a consultar los mensajes */}
        <button
          type="button"
          onClick={actualizar}
          className="rounded bg-orange-600 px-3 py-1 text-sm text-white hover:bg-orange-700"
        >
          Actualizar
        </button>

      </div>

      {/* Mostramos los mensajes de la conversación */}
      <div
        className="mb-3 max-h-64 space-y-2 overflow-y-auto"
        aria-live="polite"
      >

        {!mensajes.length && (
          <p className="text-sm opacity-70">
            Todavía no hay mensajes. Podés escribir el primero.
          </p>
        )}

        {mensajes.map((m) => (

          <div
            key={m.id}
            className={`rounded-lg p-3 text-sm ${
              m.emisorTipo === 'ADMIN'
                ? 'bg-orange-100 text-slate-900'
                : 'bg-sky-100 text-slate-900'
            }`}
          >

            {/* Identificamos quién envió el mensaje */}
            <div className="mb-1 text-xs font-bold">
              {m.emisorTipo === 'ADMIN'
                ? 'Agencia'
                : 'Cliente'}

              {' · '}

              {new Date(
                m.fechaEnvio
              ).toLocaleString('es-AR')}
            </div>

            {/* Contenido del mensaje */}
            <p className="whitespace-pre-wrap wrap-break-word">
              {m.contenido}
            </p>

          </div>
        ))}

      </div>

      {/* Formulario para escribir un mensaje */}
      <form
        onSubmit={enviar}
        className="flex gap-2"
      >

        <input
          aria-label="Escribir mensaje"
          maxLength={2000}
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          placeholder="Escribir mensaje..."
          className="min-w-0 flex-1 rounded border p-2 text-orange"
        />

        <button
          type="submit"
          disabled={cargando || !contenido.trim()}
          className="rounded bg-orange-600 px-3 py-2 text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {cargando ? 'Enviando...' : 'Enviar'}
        </button>

      </form>

      {/* NOTIFICACIONES CON EL ESTILO DE DESCUBRE CÓRDOBA */}
      {/* Se muestran centradas aunque estemos abajo de la página. */}
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

            {/* Texto de la notificación */}
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

            {/* Botón naranja para cerrar el aviso */}
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

    </section>
  );
}
