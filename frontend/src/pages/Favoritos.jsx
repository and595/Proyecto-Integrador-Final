
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarFavoritos, quitarFavorito } from '../services/favoritosService.js';

// Obtenemos la URL de la imagen de cada excursión.
// Si la imagen está guardada en uploads, agregamos la dirección del backend.
// Esto permite que las imágenes se vean correctamente en favoritos.
function obtenerUrlImagen(imagen) {
    const url = typeof imagen === 'string' ? imagen : imagen?.url;

    return url?.startsWith('/uploads/')
        ? `http://localhost:3000${url}`
        : (url || '');
}

function Favoritos() {

    // Guardamos las excursiones favoritas del usuario.
    const [favoritos, setFavoritos] = useState([]);

    // Controlamos si los favoritos se están cargando.
    const [cargando, setCargando] = useState(true);

    // Guardamos el ID de la excursión que se está eliminando.
    const [eliminando, setEliminando] = useState(null);

    // Guardamos los mensajes de error.
    const [error, setError] = useState('');

    // Cuando se abre la página, buscamos los favoritos del usuario.
    useEffect(() => {
        let activo = true;

        // Llamamos al servicio que obtiene los favoritos desde el backend.
        listarFavoritos()
            .then((data) => {
                if (activo) {
                    setFavoritos(data);
                }
            })
            .catch((err) => {
                if (activo) {
                    setError(
                        err.response?.data?.mensaje ||
                        'No se pudieron cargar tus favoritos.'
                    );
                }
            })
            .finally(() => {
                if (activo) {
                    setCargando(false);
                }
            });

        // Evitamos actualizar los estados si salimos de la página.
        return () => {
            activo = false;
        };
    }, []);

    // Función para quitar una excursión de favoritos.
    const quitar = async (idExcursion) => {
        setEliminando(idExcursion);
        setError('');

        try {
            // Eliminamos el favorito desde el backend.
            await quitarFavorito(idExcursion);

            // Actualizamos la lista sin tener que recargar la página.
            setFavoritos((actuales) =>
                actuales.filter(
                    (favorito) => favorito.excursion?.id !== idExcursion
                )
            );

        } catch (err) {
            setError(
                err.response?.data?.mensaje ||
                'No se pudo quitar de favoritos.'
            );

        } finally {
            // Habilitamos nuevamente el botón.
            setEliminando(null);
        }
    };

    return (
        <section className="space-y-8">

            {/* Título de la página */}
            <header>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
                    Tu colección
                </p>

                <h1 className="mt-8 text-3xl font-black text-slate-900 sm:text-4xl">
                    Mis favoritos
                </h1>
            </header>

            {/* Mostramos un mensaje mientras se cargan los favoritos */}
            {cargando && (
                <p className="text-slate-500">
                    Cargando favoritos...
                </p>
            )}

            {/* Mostramos un mensaje si ocurre algún error */}
            {error && (
                <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
                >
                    {error}
                </div>
            )}

            {/* Si el usuario no tiene favoritos, mostramos un mensaje */}
            {!cargando && !error && favoritos.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">

                    <p className="font-semibold text-slate-800">
                        Todavía no guardaste excursiones.
                    </p>

                    {/* Enlace para volver al catálogo */}
                    <Link
                        to="/excursiones"
                        className="mt-4 inline-block font-semibold text-orange-600 hover:text-orange-700"
                    >
                        Explorar excursiones
                    </Link>
                </div>
            )}

            {/* Mostramos las excursiones guardadas como favoritas */}
            {!cargando && favoritos.length > 0 && (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

                    {favoritos
                        .filter((favorito) => favorito.excursion)
                        .map((favorito) => {

                            // Obtenemos los datos de la excursión asociada.
                            const excursion = favorito.excursion;

                            // Obtenemos la imagen para mostrarla en la tarjeta.
                            const imagen = obtenerUrlImagen(excursion.imagen);

                            return (
                                <article
                                    key={favorito.id}
                                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                                >

                                    {/* Imagen de la excursión.
                                        Al hacer clic, vamos a su página de detalles. */}
                                    <Link
                                        to={`/excursiones/${excursion.id}`}
                                        aria-label={`Ver detalles de ${excursion.nombre}`}
                                        className="block"
                                    >
                                        {imagen ? (
                                            <img
                                                src={imagen}
                                                alt={excursion.nombre}
                                                className="h-52 w-full object-cover transition hover:opacity-90"
                                            />
                                        ) : (
                                            <div className="flex h-52 items-center justify-center bg-slate-200 text-slate-500">
                                                Sin imagen
                                            </div>
                                        )}
                                    </Link>

                                    {/* Información de la excursión */}
                                    <div className="space-y-4 p-5">

                                        <div>

                                            {/* El nombre también permite ingresar al detalle */}
                                            <Link
                                                to={`/excursiones/${excursion.id}`}
                                                className="block"
                                            >
                                                <h2 className="text-xl font-bold text-slate-900 hover:text-orange-600">
                                                    {excursion.nombre}
                                                </h2>
                                            </Link>

                                            <p className="mt-1 text-sm text-orange-600">
                                                {excursion.ubicacion}
                                            </p>
                                        </div>

                                        {/* Descripción de la excursión */}
                                        <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                                            {excursion.descripcion}
                                        </p>

                                        {/* Botón para ver toda la información de la excursión */}
                                        <Link
                                            to={`/excursiones/${excursion.id}`}
                                            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-orange-300 px-4 py-2 text-sm font-bold text-orange-700 transition hover:bg-orange-50"
                                        >
                                            Ver detalles
                                        </Link>

                                        {/* Precio y duración */}
                                        <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm">

                                            <span className="font-semibold text-slate-900">
                                                ${excursion.precio}
                                            </span>

                                            <span className="text-slate-500">
                                                {excursion.duracion ||
                                                    'Duración a confirmar'}
                                            </span>
                                        </div>

                                        {/* Botón para eliminar la excursión de favoritos */}
                                        <button
                                            type="button"
                                            onClick={() => quitar(excursion.id)}
                                            disabled={eliminando === excursion.id}
                                            className="w-full rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700 disabled:cursor-wait disabled:opacity-60"
                                        >
                                            {eliminando === excursion.id
                                                ? 'Quitando...'
                                                : 'Quitar de favoritos'}
                                        </button>

                                    </div>
                                </article>
                            );
                        })}
                </div>
            )}
        </section>
    );
}

export default Favoritos;
