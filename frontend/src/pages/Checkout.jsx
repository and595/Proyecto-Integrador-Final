
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, X } from "lucide-react";

import { obtenerResumenCarrito } from "../services/carritoService.js";
import { crearOrden } from "../services/ordersService.js";

import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

import {
  obtenerPerfilUsuario,
  actualizarPerfilUsuario,
} from "../services/authService.js";

export default function Checkout() {

  const navigate = useNavigate();

  const { limpiar } = useCart();
  const { actualizarUsuario } = useAuth();

  // Guardamos el teléfono del cliente.
  const [telefono, setTelefono] = useState("");
  const [cargandoTelefono, setCargandoTelefono] = useState(true);

  // Controlamos si acepta las condiciones.
  const [acepta, setAcepta] = useState(false);

  // Guardamos las excursiones del carrito.
  const [items, setItems] = useState([]);

  // Controlamos los errores y el proceso de reserva.
  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState(false);

  // Cerramos automáticamente el aviso después de 5 segundos.
  useEffect(() => {
    if (!error) return;

    const tiempo = setTimeout(() => {
      setError("");
    }, 5000);

    return () => clearTimeout(tiempo);

  }, [error]);

  // Cargamos el carrito y el teléfono del usuario.
  useEffect(() => {

    obtenerResumenCarrito()
      .then((r) => setItems(r.items))
      .catch((e) => {
        setError(
          e.response?.data?.mensaje ||
          "No se pudo obtener carrito"
        );
      });

    // Consultamos el teléfono guardado en el perfil.
    obtenerPerfilUsuario()
      .then((r) => {
        setTelefono(r.data?.telefono || "");
      })
      .catch(() => {
        setError(
          "No se pudo consultar tu teléfono. Podés escribirlo aquí."
        );
      })
      .finally(() => {
        setCargandoTelefono(false);
      });

  }, []);

  // Calculamos el total del carrito.
  const total = items.reduce(
    (sum, i) =>
      sum +
      Number(i.cantidad) *
      Number(i.excursion?.precio || 0),
    0
  );

  // Confirmamos la solicitud de reserva.
  async function confirmar() {

    // Comprobamos que haya aceptado las condiciones.
    if (!acepta) {
      setError(
        "Tenés que aceptar las condiciones antes de confirmar."
      );
      return;
    }

    // Validamos que haya ingresado un teléfono correcto.
    if (!/^\+?[0-9 ()-]{8,25}$/.test(telefono.trim())) {
      setError(
        "Ingresá un teléfono válido para completar la reserva."
      );
      return;
    }

    setProcesando(true);
    setError("");

    try {

      // Guardamos el teléfono en el perfil del usuario.
      const actualizado = await actualizarPerfilUsuario({
        telefono: telefono.trim(),
      });

      // Actualizamos los datos del usuario en el contexto.
      actualizarUsuario(actualizado.usuario);

      // Creamos la orden de reserva en el backend.
      const resultado = await crearOrden();

      // Limpiamos el carrito después de registrar la reserva.
      limpiar();

      // Llevamos al cliente a Mis reservas.
      // En esa página mostraremos el mensaje de reserva registrada.
      navigate("/mis-pedidos", {
        replace: true,
        state: {
          ordenId: resultado.data.id,
          correoEnviado: resultado.correoEnviado,
        },
      });

    } catch (e) {

      // Mostramos el error si no se pudo registrar la reserva.
      setError(
        e.response?.data?.error ||
        e.response?.data?.mensaje ||
        "No se pudo registrar la reserva"
      );

    } finally {
      setProcesando(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">

      {/* Título de la página */}
      <h1 className="text-3xl font-black text-slate-900">
        Confirmar tu reserva
      </h1>

      <p className="text-slate-600">
        Revisá los datos. Tu solicitud quedará registrada
        con pago pendiente. Revisá todos los datos antes
        de confirmar.
      </p>

      {/* Mensaje flotante con el estilo de Descubre Córdoba */}
      {error && (
        <div
          role="alert"
          className="fixed left-1/2 top-24 z-9999 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-orange-500 bg-neutral-950 p-5 text-white shadow-2xl"
        >

          <div className="flex items-start gap-3">

            {/* Ícono de atención */}
            <AlertCircle
              size={24}
              className="shrink-0 text-orange-400"
            />

            {/* Texto del error */}
            <div className="min-w-0 flex-1">

              <p className="font-bold text-orange-400">
                Atención
              </p>

              <p className="mt-1 wrap-break-word text-sm leading-6 text-white">
                {error}
              </p>

            </div>

            {/* Botón naranja para cerrar el mensaje */}
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Cerrar aviso"
              className="shrink-0 rounded-lg bg-orange-500 p-2 text-white transition hover:bg-orange-600"
            >
              <X size={17} />
            </button>

          </div>
        </div>
      )}

      {/* Si el carrito está vacío */}
      {items.length === 0 ? (

        <p>
          Tu carrito no tiene excursiones.{" "}

          <Link
            className="text-orange-600"
            to="/excursiones"
          >
            Ver excursiones
          </Link>
        </p>

      ) : (

        <>
          {/* Resumen de las excursiones seleccionadas */}
          <div className="space-y-3 rounded-2xl border bg-white p-6">

            {items.map((i) => (

              <div
                key={i.id}
                className="flex justify-between gap-4 border-b pb-3"
              >

                <span>
                  {i.excursion?.nombre} —{" "}

                  {i.salida?.fecha ||
                    i.excursion?.fecha?.slice(0, 10) ||
                    "Sin fecha"}{" "}

                  — {i.cantidad} persona(s)
                </span>

                <strong>
                  $
                  {(
                    Number(i.cantidad) *
                    Number(i.excursion?.precio || 0)
                  ).toFixed(2)}
                </strong>

              </div>
            ))}

            {/* Total de la reserva */}
            <div className="flex justify-between text-xl font-bold">

              <span>Total</span>

              <span>
                ${total.toFixed(2)}
              </span>

            </div>
          </div>

          {/* Teléfono de contacto */}
          <label className="block rounded-2xl border bg-white p-5 text-sm font-semibold text-slate-800">

            Teléfono de contacto

            <input
              type="tel"
              autoComplete="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej.: 3546 123456"
              disabled={cargandoTelefono || procesando}
              required
              className="mt-2 block w-full rounded-xl border border-slate-300 p-3 font-normal outline-none focus:border-orange-500"
            />

            <span className="mt-2 block font-normal text-slate-500">
              Podés actualizarlo acá sin salir del carrito.
              También se guardará en Mi perfil.
            </span>

          </label>

          {/* Aceptación de las condiciones de reserva */}
          <label className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-slate-700">

            <input
              className="mt-1"
              type="checkbox"
              checked={acepta}
              onChange={(e) => setAcepta(e.target.checked)}
            />

            <span>
              Leí y acepto las condiciones de reserva y
              cancelación informadas en el detalle de cada
              excursión. Entiendo que mi pedido queda
              pendiente de pago, y que si la salida no puede
              realizarse recibiré información sobre
              reprogramación o devolución según las
              condiciones aplicables.
            </span>

          </label>

          {/* Información sobre el pago */}
          <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
            Las formas de pago online estarán disponibles
            próximamente. Al confirmar, el pago seguirá
            pendiente y podrás consultar la solicitud
            en Mis reservas.
          </p>

          {/* Botón para registrar la reserva */}
          <button
            type="button"
            onClick={confirmar}
            disabled={
              procesando ||
              cargandoTelefono ||
              !acepta
            }
            className="w-full rounded-xl bg-orange-500 p-4 font-bold text-white disabled:opacity-50"
          >
            {procesando
              ? "Registrando tu reserva..."
              : "Confirmar solicitud de reserva"}
          </button>

        </>
      )}
    </section>
  );
}
