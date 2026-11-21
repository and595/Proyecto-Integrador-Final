import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../services/api.js";
import { listarFechasPublicas } from "../services/excursionesService.js";
import { agregarAlCarrito } from "../services/carritoService.js";
import { useCart } from "../context/CartContext.jsx";
import {
  CalendarDays,
  Clock3,
  MapPin,
  Backpack,
  CheckCircle2,
  Info,
  Users,
  ArrowLeft,
  ShoppingCart,
} from "lucide-react";
const imagenUrl = (v) => {
  const u = typeof v === "string" ? v : v?.url;
  return u?.startsWith("/uploads/") ? `http://localhost:3000${u}` : u || "";
};
const obtenerImagenes = (imagen) => {
  const galeria = Array.isArray(imagen?.galeria)
    ? imagen.galeria
    : Array.isArray(imagen)
      ? imagen
      : [];
  const principal = Array.isArray(imagen) ? imagen[0] : imagen;
  return [...new Set([imagenUrl(principal), ...galeria.map(imagenUrl)].filter(Boolean))];
};
const formatoFecha = (fecha) =>
  new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
export default function ExcursionDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refrescar } = useCart();
  const [excursion, setExcursion] = useState(null);
  const [imagenSeleccionada, setImagenSeleccionada] = useState(0);
  const [fechas, setFechas] = useState([]);
  const [fecha, setFecha] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    let activo = true;
    Promise.all([api.get(`/excursiones/${id}`), listarFechasPublicas(id)])
      .then(([res, salidas]) => {
        if (activo) {
          setExcursion(res.data.data);
          setImagenSeleccionada(0);
          setFechas(salidas);
        }
      })
      .catch((e) => {
        if (activo) setError(e.response?.data?.mensaje || "No se pudo cargar la excursión");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [id]);
  const opciones = fechas.filter(
    (s) => s.fecha >= new Date().toISOString().slice(0, 10) && s.estadoSalida !== "CANCELADA",
  );
  const salida = opciones.find((s) => s.id === Number(fecha));
  const cupos = salida ? Number(salida.cupos) : 0;
  const reservar = async () => {
    if (!salida) return setError("Elegí una fecha.");
    if (!Number.isInteger(Number(cantidad)) || Number(cantidad) < 1 || Number(cantidad) > cupos)
      return setError("Cantidad no disponible.");
    setGuardando(true);
    setError("");
    try {
      await agregarAlCarrito(Number(id), Number(cantidad), salida.id);
      await refrescar();
      navigate("/carrito");
    } catch (e) {
      setError(e.response?.data?.mensaje || e.message);
    } finally {
      setGuardando(false);
    }
  };
  if (cargando) return <p role="status">Cargando excursión...</p>;
  if (!excursion) return <p role="alert">{error || "Excursión no encontrada"}</p>;
  const imagenes = obtenerImagenes(excursion.imagen);
  const imagenPrincipal = imagenes[imagenSeleccionada] || imagenes[0];
  return (
    <section className="mx-auto max-w-6xl space-y-7 text-slate-800">
      <Link to="/excursiones" className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700">
        <ArrowLeft size={18} /> Todas las excursiones
      </Link>
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0 space-y-7">
          <div className="space-y-3">
            <div className="overflow-hidden rounded-3xl bg-slate-200">
              {imagenPrincipal ? (
              <img
                className="aspect-video w-full object-cover"
                src={imagenPrincipal}
                alt={excursion.nombre}
              />
              ) : (
                <div className="flex aspect-video items-center justify-center text-slate-500">
                  Fotografía próximamente
                </div>
              )}
            </div>
            {imagenes.length > 1 && (
              <div className="flex flex-wrap gap-3" aria-label="Galería de imágenes">
                {imagenes.map((imagen, indice) => (
                  <button
                    key={imagen}
                    type="button"
                    onClick={() => setImagenSeleccionada(indice)}
                    aria-label={`Ver fotografía ${indice + 1}`}
                    aria-pressed={imagenSeleccionada === indice}
                    className={`overflow-hidden rounded-xl border-2 ${
                      imagenSeleccionada === indice
                        ? "border-orange-600"
                        : "border-transparent"
                    }`}
                  >
                    <img
                      src={imagen}
                      alt={`${excursion.nombre}, fotografía ${indice + 1}`}
                      className="h-20 w-28 object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="mb-2 font-semibold uppercase tracking-wide text-orange-600">Descubre Córdoba</p>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{excursion.nombre}</h1>
            <p className="mt-3 flex items-center gap-2 text-slate-600">
              <MapPin size={18} />
              {excursion.ubicacion}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {excursion.duracion && (
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm shadow-sm">
                <Clock3 size={17} />
                {excursion.duracion}
              </span>
            )}
            {excursion.dificultad && (
              <span className="rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-900">
                Dificultad {excursion.dificultad}
              </span>
            )}
          </div>
          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
            <h2 className="mb-3 text-xl font-bold">Sobre la excursión</h2>
            <p className="whitespace-pre-line leading-7 text-slate-600">{excursion.descripcion}</p>
          </article>
          {[
            ["Qué llevar", excursion.queLlevar, Backpack],
            ["Qué incluye", excursion.incluye, CheckCircle2],
            ["Recomendaciones", excursion.recomendaciones, Info],
            ["Punto de encuentro", excursion.puntoEncuentro, MapPin],
            ["Reservas y cancelaciones", excursion.condicionesReserva, Info],
          ]
            .filter(([, v]) => Boolean(v))
            .map(([titulo, contenido, Icono]) => (
              <article key={titulo} className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
                  <Icono size={20} className="text-orange-600" />
                  {titulo}
                </h2>
                <p className="whitespace-pre-line leading-7 text-slate-600">{contenido}</p>
              </article>
            ))}
        </div>
        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Precio por persona</p>
          <p className="mb-5 text-3xl font-extrabold text-slate-900">
            ${Number(excursion.precio).toLocaleString("es-AR")}
          </p>
          <label className="mb-2 flex items-center gap-2 font-semibold" htmlFor="salida">
            <CalendarDays size={18} /> Elegí tu fecha
          </label>
          <select
            id="salida"
            value={fecha}
            onChange={(e) => {
              setFecha(e.target.value);
              setCantidad(1);
            }}
            className="w-full rounded-xl border border-slate-300 p-3">
            <option value="">Seleccionar fecha</option>
            {opciones.map((s) => (
              <option key={s.id} value={s.id} disabled={Number(s.cupos) === 0}>
                {formatoFecha(s.fecha)}
                {s.horaSalida ? ` · ${s.horaSalida.slice(0, 5)} hs` : ""}
                {Number(s.cupos) === 0 ? " · Agotada" : ""}
              </option>
            ))}
          </select>
          {salida && (
            <p
              aria-live="polite"
              className={`mt-3 flex items-center gap-2 text-sm font-semibold ${cupos <= 10 ? "text-orange-700" : "text-emerald-700"}`}>
              <Users size={17} />
              {cupos === 0
                ? "Agotado"
                : cupos <= 10
                  ? `¡Quedan solo ${cupos} lugares!`
                  : `${cupos} lugares disponibles`}
            </p>
          )}
          {opciones.length === 0 && (
            <p className="mt-3 text-sm text-slate-500">No hay salidas disponibles para reservar.</p>
          )}
          <label htmlFor="cantidad" className="mt-5 block text-sm font-semibold">
            Cantidad de personas
          </label>
          <input
            id="cantidad"
            type="number"
            min="1"
            max={cupos || 1}
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 p-3"
          />
          <div className="my-5 flex justify-between border-t pt-4">
            <span>Total</span>
            <strong>${(Number(excursion.precio) * Number(cantidad || 0)).toLocaleString("es-AR")}</strong>
          </div>
          {error && (
            <p role="alert" className="mb-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            onClick={reservar}
            disabled={!salida || !cupos || guardando}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 p-3 font-bold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300">
            <ShoppingCart size={19} />
            {guardando ? "Agregando..." : "Agregar al carrito"}
          </button>
        </aside>
      </div>
    </section>
  );
}