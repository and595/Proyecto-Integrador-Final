// - GESTIÓN DE RESERVAS
// Se reutiliza el panel administrativo existente y se incorpora el acceso al chat por detalle.

import ReservaChat from "../../components/ReservaChat.jsx";
import { adminApi } from "../../services/adminApi.js";
import { useEffect, useState } from "react";
import { Eye, MessageCircle, RefreshCw, CheckCircle2, AlertCircle, X } from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import {
  listarComprasAdmin,
  actualizarEstadoCompraAdmin,
  listarExcursiones,
  listarFechasExcursion,
} from "../../services/adminService.js";
const dinero = (v) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
    Number(v) || 0,
  );
const fechaBonita = (v) => (v ? new Date(v).toLocaleString("es-AR") : "—");
const vacios = {
  estado: "",
  desde: "",
  hasta: "",
  idExcursion: "",
  idFechaExcursion: "",
};
// El pago corresponde a Compra.estado; la situación de cada excursión
// corresponde a DetalleCompra.estado. No confundimos ambos estados.
const estadoDetalle = (detalle, compra) => {
  // Priorizamos la baja de la salida, que es distinta de la cancelación individual.
  if (detalle?.salida?.estadoSalida === "CANCELADA") return "SALIDA DADA DE BAJA";
  if (detalle?.estado === "CANCELADA") return "CANCELADA";
  return detalle?.estado || compra?.estado || "SIN ESTADO";
};

const estadoReserva = (compra) => {
  const detalles = compra?.detalles || [];
  if (!detalles.length) return compra?.estado || "SIN ESTADO";
  const estados = detalles.map((detalle) => estadoDetalle(detalle, compra));
  const cancelados = estados.filter((e) => ["CANCELADA", "SALIDA DADA DE BAJA"].includes(e)).length;
  if (cancelados === detalles.length) {
    // Si todas las excursiones fueron dadas de baja, conservamos ese motivo.
    if (estados.every((e) => e === "SALIDA DADA DE BAJA")) return "SALIDA DADA DE BAJA";
    if (estados.every((e) => e === "CANCELADA")) return "CANCELADA";
    return "CANCELADA / SALIDA DADA DE BAJA";
  }
  if (cancelados > 0) return "CANCELACIÓN PARCIAL";
  return estados.every((e) => e === estados[0]) ? estados[0] : "ESTADOS MIXTOS";
};

const colorEstado = (estado) => {
  if (estado === "CONFIRMADA") return "border-emerald-700 bg-emerald-950 text-emerald-200";
  if (["CANCELADA", "SALIDA DADA DE BAJA", "CANCELADA / SALIDA DADA DE BAJA"].includes(estado)) return "border-red-700 bg-red-950 text-red-200";
  if (estado === "CANCELACIÓN PARCIAL") return "border-amber-600 bg-amber-950 text-amber-200";
  return "border-slate-600 bg-slate-800 text-slate-200";
};

const EtiquetaEstado = ({ estado }) => (
  <span className={`inline-block rounded-md border px-2 py-1 text-xs font-semibold ${colorEstado(estado)}`}>
    {estado || "SIN ESTADO"}
  </span>
);

function AdminCompras() {
  const { esAdmin, rol } = useAdminAuth();
  const puedeGestionar = esAdmin || rol === "GESTOR DE RESERVAS";
  const [filtros, setFiltros] = useState(vacios),
    [pagina, setPagina] = useState(1),
    [resultado, setResultado] = useState({ items: [], total: 0, paginas: 0 }),
    [excursiones, setExcursiones] = useState([]),
    [fechas, setFechas] = useState([]);
  const [seleccion, setSeleccion] = useState(null),
    [cargando, setCargando] = useState(false),
    [error, setError] = useState(""),
    [mensaje, setMensaje] = useState("");
  // Ocultamos automáticamente los avisos después de cinco segundos.
  useEffect(() => {
    if (!error && !mensaje) return;
    const tiempo = setTimeout(() => {
      setError("");
      setMensaje("");
    }, 5000);
    return () => clearTimeout(tiempo);
  }, [error, mensaje]);

  const [chatDetalle, setChatDetalle] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [textoResolucion, setTextoResolucion] = useState({});
  const [vista, setVista] = useState("reservas");
  const [seccionCancelacion, setSeccionCancelacion] = useState("solicitudes");
  const [historial, setHistorial] = useState([]),
    [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [chatHistorial, setChatHistorial] = useState(null),
    [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [excCancelar, setExcCancelar] = useState(""),
    [fechaCancelar, setFechaCancelar] = useState(""),
    [fechasCancelar, setFechasCancelar] = useState([]),
    [motivoSalida, setMotivoSalida] = useState(""),
    [cancelando, setCancelando] = useState(false);
  async function cargarHistorial() {
    setCargandoHistorial(true);
    try {
      setHistorial(await adminApi.get("/api/hackathon/admin/historial"));
    } catch (e) {
      setError(e.message);
    } finally {
      setCargandoHistorial(false);
    }
  }
  useEffect(() => {
    if (vista === "cancelaciones" && seccionCancelacion === "historial")
      cargarHistorial();
  }, [vista, seccionCancelacion]);
  async function cargarSolicitudes() {
    try {
      setSolicitudes(await adminApi.get("/api/hackathon/admin/solicitudes"));
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    cargarSolicitudes();
  }, []);
  async function resolverSolicitud(id, decision) {
    const resolucion = textoResolucion[id] || "";
    if (resolucion.trim().length < 5) {
      setError("Escribí una resolución de al menos 5 caracteres");
      return;
    }
    if (!window.confirm(`¿Confirmar ${decision}?`)) return;
    try {
      await adminApi.put(`/api/hackathon/admin/solicitudes/${id}`, {
        decision,
        resolucion,
      });
      setMensaje(
        decision === "ACEPTADA"
          ? "Solicitud de cancelación aprobada correctamente."
          : "Solicitud de cancelación rechazada correctamente."
      );
      await cargarSolicitudes();
      await cargarHistorial();
      await cargar();
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    if (excCancelar)
      listarFechasExcursion(excCancelar)
        .then(setFechasCancelar)
        .catch(() => setFechasCancelar([]));
    else setFechasCancelar([]);
    setFechaCancelar("");
  }, [excCancelar]);
  const cancelarSalida = async (e) => {
    e.preventDefault();
    if (
      !fechaCancelar ||
      !window.confirm(
        "¿Cancelar esta salida y avisar a las reservas afectadas?",
      )
    )
      return;
    setCancelando(true);
    setError("");
    try {
      const r = await adminApi.post(
        `/api/hackathon/admin/salidas/${fechaCancelar}/cancelar`,
        { motivo: motivoSalida },
      );
      setMensaje(
        `Salida dada de baja. Reservas notificadas: ${r.data?.reservasAvisadas ?? r.reservasAvisadas ?? 0}.`,
      );
      setMotivoSalida("");
      setFechaCancelar("");
      setFechasCancelar(await listarFechasExcursion(excCancelar));
      await cargarHistorial();
      await cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setCancelando(false);
    }
  };
  const cambiar = (clave, valor) => {
    setFiltros((v) => ({
      ...v,
      [clave]: valor,
      ...(clave === "idExcursion" ? { idFechaExcursion: "" } : {}),
    }));
    setPagina(1);
  };
  const cargar = async () => {
    setCargando(true);
    setError("");
    try {
      const d = await listarComprasAdmin({ ...filtros, pagina, limite: 10 });
      setResultado(
        d?.items
          ? d
          : {
              items: Array.isArray(d) ? d : [],
              total: d?.length || 0,
              paginas: 1,
            },
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => {
    cargar();
  }, [pagina, filtros]);
  useEffect(() => {
    listarExcursiones()
      .then((r) => setExcursiones(Array.isArray(r) ? r : r?.items || []))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (filtros.idExcursion)
      listarFechasExcursion(filtros.idExcursion)
        .then(setFechas)
        .catch(() => setFechas([]));
    else setFechas([]);
  }, [filtros.idExcursion]);
  const abrir = (c) => {
    setChatDetalle(null);
    setSeleccion(c);
  };
const accion = async (c, estado) => {
  if (!confirm(`¿Marcar la reserva #${c.id} como ${estado}?`)) return;

  try {
    setError("");

    await actualizarEstadoCompraAdmin(c.id, estado);

    setMensaje(
      estado === "CONFIRMADA"
        ? "Reserva confirmada correctamente."
        : "Reserva cancelada y cupos liberados."
    );

    setSeleccion(null);
    await cargar();

  } catch (e) {
    setError(e.message);
  }
};
  const whatsapp = (c) => {
    const numero = String(c?.usuario?.telefono || "").replace(/\D/g, "");
    if (!numero) return null;
    return `https://wa.me/${numero}?text=${encodeURIComponent(`Hola ${c.usuario.nombre}, te contactamos de Descubre Córdoba por tu reserva #${c.id}. ¿Podemos ayudarte a coordinar el pago?`)}`;
  };
  return (
    <div className="space-y-5 text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Gestión de reservas</h2>
          <p className="text-sm text-slate-400">
            Filtrá por fecha de solicitud, excursión y salida; consultá y
            gestioná cada pago.
          </p>
        </div>
        <button onClick={cargar} className="rounded-lg bg-slate-800 px-4 py-2">
          <RefreshCw size={16} className="mr-2 inline" />
          Actualizar
        </button>
      </header>
      {/* Aviso flotante, centrado, con los colores de Descubre Córdoba. */}
      {(error || mensaje) && (
        <div
          role={error ? "alert" : "status"}
          className="fixed left-1/2 top-24 z-9999 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-orange-500 bg-neutral-950 p-5 text-white shadow-2xl"
        >
          <div className="flex items-start gap-3">
            {error ? (
              <AlertCircle size={24} className="shrink-0 text-orange-400" />
            ) : (
              <CheckCircle2 size={24} className="shrink-0 text-orange-400" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-orange-400">
                {error ? "Atención" : "¡Listo!"}
              </p>
              <p className="mt-1 wrap-break-word text-sm leading-6 text-white">
                {error || mensaje}
              </p>
            </div>
            <button
              type="button"
              aria-label="Cerrar aviso"
              onClick={() => { setError(""); setMensaje(""); }}
              className="shrink-0 rounded-lg bg-orange-500 p-2 text-white transition hover:bg-orange-600"
            >
              <X size={17} />
            </button>
          </div>
        </div>
      )}
      <nav className="flex flex-wrap gap-2" aria-label="Secciones de reservas">
        {[
          ["reservas", "Reservas"],
          [
            "cancelaciones",
            `Cancelaciones (${solicitudes.filter((x) => x.estado === "EN_EVALUACION").length})`,
          ],
        ].map(([id, nombre]) => (
          <button
            key={id}
            onClick={() => setVista(id)}
            className={`rounded-lg px-4 py-3 font-semibold ${vista === id ? "bg-orange-600 text-white" : "bg-slate-800 text-slate-200"}`}
          >
            {nombre}
          </button>
        ))}
      </nav>
      {vista === "cancelaciones" && (
        <nav
          aria-label="Secciones de cancelaciones"
          className="flex flex-wrap gap-2 rounded-xl border border-slate-700 bg-slate-900 p-3"
        >
          {[
            [
              "solicitudes",
              `Solicitudes pendientes (${solicitudes.filter((x) => x.estado === "EN_EVALUACION").length})`,
            ],
            ["historial", "Historial"],
            ["baja", "Baja masiva"],
          ].map(([id, nombre]) => (
            <button
              key={id}
              onClick={() => setSeccionCancelacion(id)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${seccionCancelacion === id ? "bg-cyan-700 text-white" : "bg-slate-800 text-slate-200"}`}
            >
              {nombre}
            </button>
          ))}
        </nav>
      )}
      {vista === "cancelaciones" && seccionCancelacion === "solicitudes" && (
        <section className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold">
              Solicitudes de cancelación pendientes
            </h3>
            <button
              onClick={cargarSolicitudes}
              className="rounded bg-slate-700 px-3 py-2 text-xs"
            >
              Actualizar
            </button>
          </div>
          {solicitudes
            .filter((x) => x.estado === "EN_EVALUACION")
            .map((x) => (
              <div
                key={x.id}
                className="rounded-lg border border-slate-600 p-3 space-y-2"
              >
                <p>
                  Detalle de reserva: {x.idDetalleCompra} ·{" "}
                  {x.fechaSolicitud &&
                    new Date(x.fechaSolicitud).toLocaleDateString("es-AR")}
                </p>
                <p className="text-sm">Motivo: {x.motivo}</p>
                <textarea
                  placeholder="Explicá la resolución al cliente"
                  value={textoResolucion[x.id] || ""}
                  onChange={(e) =>
                    setTextoResolucion((v) => ({
                      ...v,
                      [x.id]: e.target.value,
                    }))
                  }
                  className="w-full rounded bg-slate-800 p-2"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => resolverSolicitud(x.id, "ACEPTADA")}
                    className="rounded bg-emerald-700 px-3 py-2 text-sm"
                  >
                    Aprobar cancelación
                  </button>
                  <button
                    onClick={() => resolverSolicitud(x.id, "RECHAZADA")}
                    className="rounded bg-red-800 px-3 py-2 text-sm"
                  >
                    Rechazar
                  </button>
                  <button
                    disabled
                    title="Módulo pendiente"
                    className="rounded bg-slate-700 px-3 py-2 text-sm opacity-50"
                  >
                    Reprogramar (próximamente)
                  </button>
                </div>
              </div>
            ))}
          {!solicitudes.some((x) => x.estado === "EN_EVALUACION") && (
            <p className="text-sm text-slate-400">
              No hay solicitudes pendientes.
            </p>
          )}
        </section>
      )}
      {vista === "cancelaciones" && seccionCancelacion === "baja" && (
        <form
          onSubmit={cancelarSalida}
          className="space-y-3 rounded-xl border border-red-800 bg-slate-900 p-4"
        >
          <h3 className="text-lg font-bold">Baja masiva de una salida</h3>
          <p className="text-sm text-slate-400">
            Elegí una excursión y una de sus fechas creadas. No hace falta
            escribir IDs.
          </p>
          <label className="block text-sm">
            Excursión
            <select
              required
              value={excCancelar}
              onChange={(e) => setExcCancelar(e.target.value)}
              className="mt-1 w-full rounded bg-slate-800 p-3"
            >
              <option value="">Seleccionar excursión</option>
              {excursiones.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Fecha de salida
            <select
              required
              value={fechaCancelar}
              onChange={(e) => setFechaCancelar(e.target.value)}
              className="mt-1 w-full rounded bg-slate-800 p-3"
            >
              <option value="">Seleccionar fecha</option>
              {fechasCancelar
                .filter((f) => f.estadoSalida !== "CANCELADA")
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {String(f.fecha).slice(0, 10)} · {f.reservados ?? 0}{" "}
                    reservado(s)
                  </option>
                ))}
            </select>
          </label>
          <label className="block text-sm">
            Motivo de la suspensión
            <textarea
              required
              minLength={10}
              value={motivoSalida}
              onChange={(e) => setMotivoSalida(e.target.value)}
              placeholder="Explicá el motivo"
              className="mt-1 w-full rounded bg-slate-800 p-3"
            />
          </label>
          <button
            disabled={cancelando || !fechaCancelar}
            className="rounded bg-red-700 px-4 py-3 font-semibold disabled:opacity-40"
          >
            {cancelando
              ? "Procesando baja..."
              : "Dar de baja esta salida y notificar"}
          </button>
        </form>
      )}
      {vista === "cancelaciones" && seccionCancelacion === "historial" && (
        <section className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">
                Historial de cancelaciones y bajas
              </h3>
              <p className="text-xs text-slate-400">
                Cada reserva conserva su conversación, incluso si la salida fue
                suspendida.
              </p>
            </div>
            <button
              onClick={cargarHistorial}
              className="rounded bg-slate-700 px-3 py-2 text-sm"
            >
              Actualizar
            </button>
          </div>
          <input
            aria-label="Buscar en historial"
            value={busquedaHistorial}
            onChange={(e) => setBusquedaHistorial(e.target.value)}
            placeholder="Buscar por cliente, excursión, fecha o reserva"
            className="w-full rounded-lg bg-slate-800 p-3 text-sm text-white"
          />
          {cargandoHistorial && (
            <p className="text-sm text-slate-400">Cargando historial...</p>
          )}
          {historial
            .filter((d) => {
              const texto =
                `${d.id} ${d.idCompra} ${d.compra?.usuario?.nombre || ""} ${d.compra?.usuario?.apellido || ""} ${d.excursion?.nombre || ""} ${d.salida?.fecha || ""}`.toLowerCase();
              return texto.includes(busquedaHistorial.toLowerCase());
            })
            .map((d) => (
              <article
                key={d.id}
                className="space-y-2 rounded-lg border border-slate-700 bg-slate-800 p-4"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <strong>
                    {d.excursion?.nombre || "Excursión"} · Reserva #{d.idCompra}
                  </strong>
                  <span className="rounded bg-red-950 px-2 py-1 text-xs text-red-200">
                    {d.salida?.estadoSalida === "CANCELADA"
                      ? "Salida dada de baja"
                      : "Reserva cancelada"}
                  </span>
                </div>
                <p className="text-sm text-slate-300">
                  Cliente: {d.compra?.usuario?.nombre || "—"}{" "}
                  {d.compra?.usuario?.apellido || ""} ·{" "}
                  {d.compra?.usuario?.email || ""}
                </p>
                <p className="text-sm text-slate-300">
                  Salida: {d.salida?.fecha || "Sin fecha"}
                  {d.salida?.horaSalida
                    ? ` · ${d.salida.horaSalida.slice(0, 5)} hs`
                    : ""}{" "}
                  · {d.cantidad} persona(s)
                </p>
                {d.salida?.motivoSuspension && (
                  <p className="text-sm text-amber-200">
                    Motivo de baja: {d.salida.motivoSuspension}
                  </p>
                )}
                {d.solicitudes
                  ?.filter((x) => x.estado === "ACEPTADA")
                  .map((x) => (
                    <p key={x.id} className="text-sm text-slate-300">
                      Solicitud aceptada: {x.motivo} · {x.resolucion}
                    </p>
                  ))}
                <button
                  type="button"
                  onClick={() =>
                    setChatHistorial(chatHistorial === d.id ? null : d.id)
                  }
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold"
                >
                  {chatHistorial === d.id
                    ? "Cerrar conversación"
                    : "Ver conversación"}
                </button>
                {chatHistorial === d.id && (
                  <div className="rounded-lg bg-slate-900 p-3">
                    <ReservaChat idDetalle={d.id} esAdmin />
                  </div>
                )}
              </article>
            ))}
          {!cargandoHistorial && historial.length === 0 && (
            <p className="text-sm text-slate-400">
              Todavía no hay registros de cancelaciones o bajas.
            </p>
          )}
        </section>
      )}
      {vista === "reservas" && (
        <>
          <section className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-xs">
              Desde
              <input
                type="date"
                value={filtros.desde}
                onChange={(e) => cambiar("desde", e.target.value)}
                className="mt-1 block w-full rounded bg-slate-800 p-2"
              />
            </label>
            <label className="text-xs">
              Hasta
              <input
                type="date"
                value={filtros.hasta}
                onChange={(e) => cambiar("hasta", e.target.value)}
                className="mt-1 block w-full rounded bg-slate-800 p-2"
              />
            </label>
            <label className="text-xs">
              Estado
              <select
                value={filtros.estado}
                onChange={(e) => cambiar("estado", e.target.value)}
                className="mt-1 block w-full rounded bg-slate-800 p-2"
              >
                <option value="">Todos</option>
                {["PENDIENTE", "CONFIRMADA", "CANCELADA"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              Excursión
              <select
                value={filtros.idExcursion}
                onChange={(e) => cambiar("idExcursion", e.target.value)}
                className="mt-1 block w-full rounded bg-slate-800 p-2"
              >
                <option value="">Todas</option>
                {excursiones.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              Salida
              <select
                value={filtros.idFechaExcursion}
                onChange={(e) => cambiar("idFechaExcursion", e.target.value)}
                className="mt-1 block w-full rounded bg-slate-800 p-2"
              >
                <option value="">Todas</option>
                {fechas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.fecha}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-5">
              <button
                onClick={() => {
                  const ayer = new Date();
                  ayer.setDate(ayer.getDate() - 1);
                  const f = [
                    ayer.getFullYear(),
                    String(ayer.getMonth() + 1).padStart(2, "0"),
                    String(ayer.getDate()).padStart(2, "0"),
                  ].join("-");
                  setFiltros((v) => ({ ...v, desde: f, hasta: f }));
                  setPagina(1);
                }}
                className="rounded bg-orange-600 px-3 py-2 text-sm"
              >
                Reservas de ayer
              </button>
              <button
                onClick={() => {
                  setFiltros(vacios);
                  setPagina(1);
                }}
                className="rounded border border-slate-500 px-3 py-2 text-sm"
              >
                Limpiar filtros
              </button>
            </div>
          </section>
          <p className="text-sm text-slate-400">
            {cargando
              ? "Cargando..."
              : `${resultado.total} reserva(s) encontradas`}
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full min-w-200 text-left text-sm">
              <thead className="bg-slate-800">
                <tr>
                  {[
                    "Reserva",
                    "Cliente",
                    "Fecha solicitud",
                    "Total",
                    "Estado de pago / compra",
                    "Estado de reserva",
                    "Detalle",
                  ].map((x) => (
                    <th key={x} className="p-3">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resultado.items.map((c) => (
                  <tr key={c.id} className="border-t border-slate-800">
                    <td className="p-3">#{c.id}</td>
                    <td className="p-3">
                      {c.usuario?.nombre} {c.usuario?.apellido}
                    </td>
                    <td className="p-3">{fechaBonita(c.fechaCompra)}</td>
                    <td className="p-3">{dinero(c.total)}</td>
                    <td className="p-3"><EtiquetaEstado estado={c.estado} /></td>
                    <td className="p-3"><EtiquetaEstado estado={estadoReserva(c)} /></td>
                    <td className="p-3">
                      <button
                        onClick={() => abrir(c)}
                        aria-label={`Ver reserva ${c.id}`}
                        className="rounded bg-slate-700 px-3 py-2"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!resultado.items.length && (
                  <tr>
                    <td colSpan="7" className="p-6 text-center">
                      Sin resultados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-end gap-3 text-sm">
            <button
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => p - 1)}
              className="rounded bg-slate-800 px-3 py-2 disabled:opacity-40"
            >
              Anterior
            </button>
            <span>
              Página {pagina} de {Math.max(1, resultado.paginas)}
            </span>
            <button
              disabled={pagina >= resultado.paginas}
              onClick={() => setPagina((p) => p + 1)}
              className="rounded bg-slate-800 px-3 py-2 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </>
      )}
      {seleccion && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/75 p-3"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSeleccion(null);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl border border-slate-700 bg-slate-900 p-6 space-y-4">
            <div className="flex justify-between">
              <h3 className="text-xl font-bold">Reserva #{seleccion.id}</h3>
              <button onClick={() => setSeleccion(null)}>Cerrar ✕</button>
            </div>
            <p>
              Cliente: {seleccion.usuario?.nombre} {seleccion.usuario?.apellido}
            </p>
            <p>Email: {seleccion.usuario?.email || "Sin email"}</p>
            <p>Teléfono: {seleccion.usuario?.telefono || "Sin teléfono"}</p>
            <p>Reserva: {fechaBonita(seleccion.fechaCompra)}</p>
            <p>Vence: {fechaBonita(seleccion.venceEn)}</p>
            <p>Importe: {dinero(seleccion.total)}</p>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 p-3">
              <span className="text-sm text-slate-300">Pago / compra:</span>
              <EtiquetaEstado estado={seleccion.estado} />
              <span className="text-sm text-slate-300">Reserva:</span>
              <EtiquetaEstado estado={estadoReserva(seleccion)} />
            </div>
            <h4 className="font-semibold">Excursiones y participantes</h4>
            {seleccion.detalles?.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded bg-slate-800 p-3">
                <span>
                  {d.excursion?.nombre || "Excursión"} ·{" "}
                  {d.salida?.fecha || "Sin salida"} · {d.cantidad} persona(s) ·{" "}
                  {dinero(Number(d.precioUnitario) * Number(d.cantidad))}
                </span>
                <EtiquetaEstado estado={estadoDetalle(d, seleccion)} />
              </div>
            ))}
            <div className="space-y-2">
              <h4 className="font-semibold">Chat por excursión reservada</h4>
              {seleccion.detalles?.map((d) => (
                <div key={d.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setChatDetalle(chatDetalle === d.id ? null : d.id)
                    }
                    className="rounded bg-orange-600 px-3 py-2 text-sm"
                  >
                    {chatDetalle === d.id
                      ? "Cerrar conversación"
                      : `Mensajes: ${d.excursion?.nombre || "Excursión"}`}
                  </button>
                  {chatDetalle === d.id && (
                    <div className="mt-2">
                      <ReservaChat idDetalle={d.id} esAdmin />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {whatsapp(seleccion) && (
              <a
                className="inline-flex items-center gap-2 rounded bg-green-700 px-4 py-2"
                href={whatsapp(seleccion)}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={18} /> Contactar por WhatsApp
              </a>
            )}
            {puedeGestionar && seleccion.estado === "PENDIENTE" && (
              <div className="space-y-2 border-t border-slate-700 pt-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => accion(seleccion, "CONFIRMADA")}
                    className="rounded bg-emerald-700 px-4 py-2"
                  >
                    Pago verificado → confirmar
                  </button>
                  <button
                    onClick={() => accion(seleccion, "CANCELADA")}
                    className="rounded bg-red-800 px-4 py-2"
                  >
                    Cancelar y liberar cupos
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default AdminCompras;