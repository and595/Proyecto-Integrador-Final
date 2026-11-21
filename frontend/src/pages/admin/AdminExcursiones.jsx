
import { Pencil, Trash2, Plus, Upload, CheckCircle2, AlertCircle, X } from "lucide-react";
import { adminApi } from "../../services/adminApi.js";
import { useEffect, useState } from "react";

import {
  listarExcursiones,
  listarCategorias,
  crearExcursion,
  actualizarExcursion,
  eliminarExcursion,
  listarFechasExcursion,
  crearFechaExcursion,
  editarFechaExcursion,
  quitarFechaExcursion,
} from "../../services/adminService";

function FechasExcursion({ excursion, mostrarAviso }) {
  const [fechas, setFechas] = useState([]),
    [edicion, setEdicion] = useState(null);
  const [fecha, setFecha] = useState(""),
    [hora, setHora] = useState(""),
    [min, setMin] = useState("1"),
    [max, setMax] = useState("10");
  const cargar = async () => {
    try {
      setFechas(await listarFechasExcursion(excursion.id));
    } catch (e) {
      mostrarAviso(e.message || "No se pudieron cargar las fechas", "error");
    }
  };
  useEffect(() => {
    cargar();
  }, [excursion.id]);
  const limpiar = () => {
    setEdicion(null);
    setFecha("");
    setHora("");
    setMin("1");
    setMax("");
  };
  const guardar = async (e) => {
    e.preventDefault();
    try {
      const datos = {
        fecha,
        horaSalida: hora || null,
        cupoMinimo: Number(min),
        cupoMaximo: Number(max),
      };
      if (edicion) await editarFechaExcursion(excursion.id, edicion, datos);
      else await crearFechaExcursion(excursion.id, datos);
      mostrarAviso(edicion ? "Salida actualizada" : "Salida agregada", "exito");
      limpiar();
      await cargar();
    } catch (e) {
      mostrarAviso(e.message || "No se pudieron cargar las fechas", "error");
    }
  };
  const editar = (f) => {
    setEdicion(f.id);
    setFecha(f.fecha);
    setHora(f.horaSalida?.slice(0, 5) || "");
    setMin(String(f.cupoMinimo ?? 1));
    setMax(String(f.cupoMaximo ?? Number(f.cupos) + Number(f.reservados || 0)));
  };
  const borrar = async (id) => {
    if (!confirm("¿Eliminar esta fecha si no tiene reservas?")) return;
    try {
      await quitarFechaExcursion(excursion.id, id);
      mostrarAviso("Fecha eliminada correctamente", "exito");
      await cargar();
    } catch (e) {
      mostrarAviso(e.message || "No se pudieron cargar las fechas", "error");
    }
  };
  return (
    <div className="mt-5 space-y-4 rounded-xl border border-slate-700 bg-slate-800 p-4 text-white">
      <h4 className="font-bold text-cyan-300">Fechas y capacidad por salida</h4>
      <p className="text-xs text-slate-400">
        Cada salida tiene un mínimo y máximo. Los disponibles se descuentan
        cuando se reserva.
      </p>
      <div className="space-y-2">
        {fechas.map((f) => (
          <div
            key={f.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900 p-3 text-sm"
          >
            <span>
              {f.fecha}{" "}
              {f.horaSalida
                ? `· ${f.horaSalida.slice(0, 5)} hs`
                : "· hora sin definir"}{" "}
              {f.estadoSalida === "CANCELADA" ? "· CANCELADA" : ""} · mínimo{" "}
              {f.cupoMinimo ?? "sin definir"} · máximo{" "}
              {f.cupoMaximo ?? "sin definir"} · disponibles {f.cupos} ·
              reservados {f.reservados ?? 0}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => editar(f)}
                className="rounded bg-cyan-800 px-3 py-1"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => borrar(f.id)}
                className="rounded bg-red-900 px-3 py-1"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={guardar} className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          Fecha
          <input
            className="mt-1 block rounded p-2 text-white"
            type="date"
            value={fecha}
            required
            onChange={(e) => setFecha(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Hora de salida
          <input
            className="mt-1 block rounded p-2 text-white"
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Mínimo
          <input
            className="mt-1 block w-24 rounded p-2 text-white"
            type="number"
            min="1"
            required
            value={min}
            onChange={(e) => setMin(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Máximo
          <input
            className="mt-1 block w-24 rounded p-2 text-white"
            type="number"
            min="1"
            required
            value={max}
            onChange={(e) => setMax(e.target.value)}
          />
        </label>
        <button className="rounded-lg bg-cyan-600 px-4 py-2 font-semibold">
          {edicion ? "Guardar cambios" : "Agregar fecha"}
        </button>
        {edicion && (
          <button
            type="button"
            onClick={limpiar}
            className="rounded-lg border px-3 py-2"
          >
            Cancelar edición
          </button>
        )}
      </form>
    </div>
  );
}

const AdminExcursiones = () => {
  const [excursiones, setExcursiones] = useState([]);
  const [paginaExcursiones, setPaginaExcursiones] = useState(1);
  const [categorias, setCategorias] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [cargando, setCargando] = useState(true);
  // Guardamos el aviso para mostrarlo siempre visible en pantalla.
  const [aviso, setAviso] = useState(null);

  const mostrarAviso = (texto, tipo = "exito") => {
    setAviso({ texto, tipo });
  };

  // El aviso desaparece solo después de unos segundos.
  useEffect(() => {
    if (!aviso) return;
    const tiempo = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(tiempo);
  }, [aviso]);

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    ubicacion: "",
    duracion: "",
    imagen: "",
    imagenes: [],
    dificultad: "",
    queLlevar: "",
    incluye: "",
    recomendaciones: "",
    puntoEncuentro: "",
    condicionesReserva: "",
    idCategoria: "",
  });

  const cargarExcursiones = async () => {
    try {
      setCargando(true);

      const respuesta = await listarExcursiones();

      setExcursiones(Array.isArray(respuesta) ? respuesta : []);
    } catch (error) {
      console.error("Error al cargar excursiones:", error);
      mostrarAviso(error.message || "Error al cargar las excursiones", "error");
    } finally {
      setCargando(false);
    }
  };

  const cargarCategorias = async () => {
    try {
      const respuesta = await listarCategorias();
      setCategorias(Array.isArray(respuesta) ? respuesta : []);
    } catch (error) {
      console.error("Error al cargar categorías:", error);
      mostrarAviso(error.message || "Error al cargar las categorías", "error");
    }
  };

  useEffect(() => {
    cargarExcursiones();
    cargarCategorias();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((formAnterior) => ({
      ...formAnterior,
      [name]: value,
    }));
  };

  const limpiarFormulario = () => {
    setForm({
      nombre: "",
      descripcion: "",
      precio: "",
      ubicacion: "",
      duracion: "",
      imagen: "",
      imagenes: [],
      dificultad: "",
      queLlevar: "",
      incluye: "",
      recomendaciones: "",
      puntoEncuentro: "",
      condicionesReserva: "",
      idCategoria: "",
    });

    setEditandoId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const datos = {
      nombre: form.nombre,
      descripcion: form.descripcion,
      precio: Number(form.precio),
      ubicacion: form.ubicacion,
      duracion: form.duracion || null,
      imagen: {
        url: form.imagen,
        galeria: [...new Set([form.imagen, ...form.imagenes].filter(Boolean))],
      },
      dificultad: form.dificultad || null,
      queLlevar: form.queLlevar || null,
      incluye: form.incluye || null,
      recomendaciones: form.recomendaciones || null,
      puntoEncuentro: form.puntoEncuentro || null,
      condicionesReserva: form.condicionesReserva || null,
      idCategoria: form.idCategoria ? Number(form.idCategoria) : null,
    };

    try {
      if (editandoId) {
        await actualizarExcursion(editandoId, datos);
        mostrarAviso("Excursión actualizada correctamente.");
      } else {
        await crearExcursion(datos);
        mostrarAviso(
          "Excursión creada. Ahora agregá la fecha, la hora y los cupos desde el listado inferior.",
        );
      }

      limpiarFormulario();
      await cargarExcursiones();
    } catch (error) {
      console.error("Error al guardar excursión:", error);
      mostrarAviso(error.message || "Error al guardar la excursión", "error");
    }
  };

  const handleEditar = (excursion) => {
    setEditandoId(excursion.id);

    setForm({
      nombre: excursion.nombre || "",
      descripcion: excursion.descripcion || "",
      precio: excursion.precio || "",
      ubicacion: excursion.ubicacion || "",
      duracion: excursion.duracion || "",
      imagen:
        (typeof excursion.imagen === "string"
          ? excursion.imagen
          : excursion.imagen?.url) || "",
      imagenes: Array.isArray(excursion.imagen?.galeria)
        ? excursion.imagen.galeria
        : typeof excursion.imagen === "string"
          ? [excursion.imagen]
          : excursion.imagen?.url
            ? [excursion.imagen.url]
            : [],
      dificultad: excursion.dificultad || "",
      queLlevar: excursion.queLlevar || "",
      incluye: excursion.incluye || "",
      recomendaciones: excursion.recomendaciones || "",
      puntoEncuentro: excursion.puntoEncuentro || "",
      condicionesReserva: excursion.condicionesReserva || "",
      idCategoria: excursion.idCategoria || "",
    });

    setAviso(null);
  };

  const handleEliminar = async (id) => {
    const confirmar = window.confirm(
      "¿Seguro que querés eliminar esta excursión?",
    );

    if (!confirmar) return;

    try {
      await eliminarExcursion(id);

      mostrarAviso("Excursión eliminada correctamente.");

      await cargarExcursiones();
    } catch (error) {
      console.error("Error al eliminar excursión:", error);
      mostrarAviso(
        error.response?.data?.mensaje ||
          error.message ||
          "Error al eliminar la excursión",
        "error",
      );
    }
  };

  if (cargando) {
    return <div className="p-8 text-slate-300">Cargando excursiones...</div>;
  }

  return (
    <div className="p-6 md:p-8 text-slate-100">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
          Gestión de contenido
        </p>

        <h1 className="mt-2 text-3xl font-bold text-white">Excursiones</h1>

        <p className="mt-2 text-slate-400">
          Creá, editá y administrá las excursiones de Descubre Córdoba.
        </p>
      </div>

      {/* El aviso aparece centrado, aunque estemos abajo de la página. */}
      {aviso && (
        <div
          role={aviso.tipo === "error" ? "alert" : "status"}
          className="fixed left-1/2 top-24 z-9999 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-orange-500 bg-neutral-950 p-5 text-white shadow-2xl"
        >
          <div className="flex items-start gap-3">
            {/* Usamos un ícono distinto para errores y mensajes de éxito. */}
            {aviso.tipo === "error" ? (
              <AlertCircle size={24} className="shrink-0 text-orange-400" />
            ) : (
              <CheckCircle2 size={24} className="shrink-0 text-orange-400" />
            )}

            <div className="min-w-0 flex-1">
              <p className="font-bold text-orange-400">
                {aviso.tipo === "error" ? "Atención" : "¡Listo!"}
              </p>
              <p className="mt-1 wrap-break-word text-sm leading-6 text-white">
                {aviso.texto}
              </p>
            </div>

            {/* El usuario también puede cerrar el aviso con la X. */}
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

      <form
        onSubmit={handleSubmit}
        className="mb-10 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl"
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              {editandoId ? "Editar excursión" : "Nueva excursión"}
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Completá los datos de la excursión.
            </p>
          </div>

          {editandoId && (
            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
              Editando ID {editandoId}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-300">
              Nombre
            </label>

            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Ej: Camino de los Gigantes"
              required
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 outline-none transition focus:border-cyan-500"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-300">
              Precio
            </label>

            <input
              type="number"
              name="precio"
              value={form.precio}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="Ej: 25000"
              required
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 outline-none transition focus:border-cyan-500"
            />
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-semibold text-slate-300">
              Descripción
            </label>

            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              placeholder="Contá brevemente de qué se trata la excursión."
              required
              className="min-h-28 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 outline-none transition focus:border-cyan-500"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-300">
              Ubicación
            </label>

            <input
              type="text"
              name="ubicacion"
              value={form.ubicacion}
              onChange={handleChange}
              placeholder="Ej: La Cumbrecita"
              required
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 outline-none transition focus:border-cyan-500"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-300">
              Duración
            </label>

            <input
              type="text"
              name="duracion"
              value={form.duracion}
              onChange={handleChange}
              placeholder="Ej: 4 horas"
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 outline-none transition focus:border-cyan-500"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="dificultad"
              className="text-sm font-semibold text-slate-300"
            >
              Dificultad
            </label>
            <select
              id="dificultad"
              name="dificultad"
              value={form.dificultad}
              onChange={handleChange}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            >
              <option value="">Sin especificar</option>
              <option>Baja</option>
              <option>Media</option>
              <option>Alta</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="puntoEncuentro"
              className="text-sm font-semibold text-slate-300"
            >
              Punto de encuentro
            </label>
            <input
              id="puntoEncuentro"
              name="puntoEncuentro"
              value={form.puntoEncuentro}
              onChange={handleChange}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </div>
          {[
            ["queLlevar", "Qué llevar"],
            ["incluye", "Qué incluye"],
            ["recomendaciones", "Recomendaciones"],
            ["condicionesReserva", "Reservas, cambios y cancelaciones"],
          ].map(([nombre, titulo]) => (
            <div key={nombre} className="flex flex-col gap-2 md:col-span-2">
              <label
                htmlFor={nombre}
                className="text-sm font-semibold text-slate-300"
              >
                {titulo}
              </label>
              <textarea
                id={nombre}
                name={nombre}
                value={form[nombre]}
                onChange={handleChange}
                rows={3}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>
          ))}
          <div className="md:col-span-2">
            <label
              htmlFor="imagenArchivo"
              className="flex items-center gap-2 text-sm font-semibold text-slate-300"
            >
              <Upload size={18} /> Subir fotografías (hasta 10, JPG, PNG o WebP, máx. 5 MB cada una)
            </label>
            <input
              id="imagenArchivo"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="mt-2 w-full rounded-lg border border-slate-700 p-3 text-sm text-white"
              onChange={async (e) => {
                const archivos = Array.from(e.target.files || []);
                if (!archivos.length) return;
                const datos = new FormData();
                archivos.forEach((archivo) => datos.append("imagenes", archivo));
                try {
                  const respuesta = await adminApi.post(
                    "/excursiones/upload",
                    datos,
                    { headers: { "Content-Type": "multipart/form-data" } },
                  );
                  const urls = respuesta.imagenes || [respuesta.url].filter(Boolean);
                  setForm((prev) => ({
                    ...prev,
                    imagen: prev.imagen || urls[0] || "",
                    imagenes: [...new Set([...prev.imagenes, ...urls])],
                  }));
                  mostrarAviso(
                    "Imágenes cargadas correctamente. Guardá la excursión para asociarlas.",
                  );
                } catch (err) {
                  mostrarAviso(
                    "Error al subir imagen: " + err.message,
                    "error",
                  );
                } finally {
                  e.target.value = "";
                }
              }}
            />
            <div className="mt-3 flex flex-wrap gap-3">
              {[...new Set([form.imagen, ...form.imagenes].filter(Boolean))].map(
                (imagen, indice) => (
                  <button
                    key={`${imagen}-${indice}`}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, imagen }))}
                    className={`overflow-hidden rounded-lg border-2 ${
                      form.imagen === imagen
                        ? "border-cyan-400"
                        : "border-slate-700"
                    }`}
                    aria-label={`Usar fotografía ${indice + 1} como principal`}
                  >
                    <img
                      src={
                        imagen.startsWith("/uploads/")
                          ? `http://localhost:3000${imagen}`
                          : imagen
                      }
                      alt={`Vista previa ${indice + 1}`}
                      className="h-28 w-40 object-cover"
                    />
                  </button>
                ),
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-semibold text-slate-300">
              URL de imagen
            </label>

            <input
              type="text"
              name="imagen"
              value={form.imagen}
              onChange={handleChange}
              placeholder="https://..."
              required
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 outline-none transition focus:border-cyan-500"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-300">
              Categoría
            </label>

            <select
              name="idCategoria"
              value={form.idCategoria}
              onChange={handleChange}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
            >
              <option value="">Sin categoría</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-xl bg-cyan-600 px-5 py-3 font-semibold text-white transition hover:bg-cyan-500"
          >
            {editandoId ? "Guardar cambios" : "Crear excursión"}
          </button>

          {editandoId && (
            <button
              type="button"
              onClick={limpiarFormulario}
              className="rounded-xl border border-slate-600 bg-slate-800 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
            >
              Cancelar edición
            </button>
          )}
        </div>
      </form>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Excursiones cargadas
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Total: {excursiones.length}
            </p>
          </div>
        </div>

        {excursiones.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-10 text-center">
            <p className="text-lg font-semibold text-white">
              No hay excursiones cargadas
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Usá el formulario de arriba para crear la primera.
            </p>
          </div>
        ) : (
          <div className="grid gap-5">
            {excursiones
              .slice((paginaExcursiones - 1) * 6, paginaExcursiones * 6)
              .map((excursion) => (
                <article
                  key={excursion.id}
                  className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-lg"
                >
                  <div className="flex flex-col justify-between gap-5 md:flex-row">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-bold text-white">
                          {excursion.nombre}
                        </h3>

                        <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                          ID {excursion.id}
                        </span>
                      </div>

                      <p className="mt-3 max-w-3xl text-slate-300">
                        {excursion.descripcion}
                      </p>

                      <div className="mt-5 grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-3">
                        <p>
                          <span className="font-semibold text-white">
                            Precio:
                          </span>{" "}
                          ${excursion.precio}
                        </p>

                        <p>
                          <span className="font-semibold text-white">
                            Ubicación:
                          </span>{" "}
                          {excursion.ubicacion}
                        </p>

                        <p>
                          <span className="font-semibold text-white">
                            Duración:
                          </span>{" "}
                          {excursion.duracion || "Sin especificar"}
                        </p>

                        <p>
                          <span className="font-semibold text-white">
                            Categoría:
                          </span>{" "}
                          {categorias.find(
                            (categoria) =>
                              categoria.id === excursion.idCategoria,
                          )?.nombre || "Sin categoría"}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-3 md:flex-col">
                      <button
                        onClick={() => handleEditar(excursion)}
                        className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-500"
                      >
                        <Pencil size={18} aria-hidden="true" />{" "}
                        <span className="sr-only">Editar</span>
                      </button>

                      <button
                        onClick={() => handleEliminar(excursion.id)}
                        className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-500"
                      >
                        <Trash2 size={18} aria-hidden="true" />{" "}
                        <span className="sr-only">Eliminar</span>
                      </button>
                    </div>
                  </div>
                  <FechasExcursion
                    excursion={excursion}
                    mostrarAviso={mostrarAviso}
                  />
                </article>
              ))}
          </div>
        )}
        <div className="mt-4 flex items-center justify-end gap-3 text-sm text-slate-300">
          <button
            type="button"
            disabled={paginaExcursiones <= 1}
            onClick={() => setPaginaExcursiones((p) => p - 1)}
            className="rounded bg-slate-800 px-3 py-2 disabled:opacity-40"
          >
            Anterior
          </button>
          <span>
            Página {paginaExcursiones} de{" "}
            {Math.max(1, Math.ceil(excursiones.length / 6))}
          </span>
          <button
            type="button"
            disabled={paginaExcursiones * 6 >= excursiones.length}
            onClick={() => setPaginaExcursiones((p) => p + 1)}
            className="rounded bg-slate-800 px-3 py-2 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </section>
    </div>
  );
};

export default AdminExcursiones;