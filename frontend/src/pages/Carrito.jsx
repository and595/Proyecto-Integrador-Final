import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import {
    actualizarCantidadItem,
    eliminarItemCarrito,
    obtenerResumenCarrito,
} from '../services/carritoService.js';

function Carrito() {
    const navigate = useNavigate();
    const location = useLocation();
    const [items, setItems] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [aviso, setAviso] = useState(null);

    // Mostramos avisos de éxito o error, sin mover la pantalla.
    const mostrarAviso = (texto, tipo = 'exito') => {
        setAviso({ texto, tipo });
    };

    // El aviso se cierra solo después de cinco segundos.
    useEffect(() => {
        if (!aviso) return;
        const tiempo = setTimeout(() => setAviso(null), 5000);
        return () => clearTimeout(tiempo);
    }, [aviso]);

    const cargarCarrito = async () => {
        try {
            const resumen = await obtenerResumenCarrito();
            setItems(resumen.items);
            return true;
        } catch (err) {
            mostrarAviso(
                err.response?.data?.mensaje || err.message || 'No se pudo cargar el carrito.',
                'error'
            );
            return false;
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarCarrito();
    }, []);

    // Mostramos el mensaje recibido desde Excursiones.jsx.
    useEffect(() => {
        const texto = location.state?.mensajeCarrito || location.state?.mensaje;
        if (!texto) return;
        mostrarAviso(texto, 'exito');
        // Lo quitamos del historial para que no se repita al volver.
        navigate(location.pathname + location.search, { replace: true, state: null });
    }, [location.state, location.pathname, location.search, navigate]);

    const cambiarCantidad = async (item, cantidad) => {
        if (!Number.isInteger(cantidad) || cantidad < 1) return;

        try {
            await actualizarCantidadItem(item.id, cantidad);
            const actualizado = await cargarCarrito();
            if (actualizado) mostrarAviso('Cantidad de personas actualizada correctamente.');
        } catch (err) {
            mostrarAviso(
                err.response?.data?.mensaje || err.message || 'No se pudo actualizar la cantidad.',
                'error'
            );
        }
    };

    const eliminar = async (idItem) => {
        try {
            await eliminarItemCarrito(idItem);
            const actualizado = await cargarCarrito();
            if (actualizado) mostrarAviso('Excursión eliminada del carrito correctamente.');
        } catch (err) {
            mostrarAviso(
                err.response?.data?.mensaje || err.message || 'No se pudo quitar el item.',
                'error'
            );
        }
    };

    const total = items.reduce((acumulado, item) => (
        acumulado + Number(item.subtotal)
    ), 0);

    // Dejamos el aviso fuera del contenido para verlo incluso al desplazarnos.
    const notificacion = aviso && (
        <div
            role={aviso.tipo === 'error' ? 'alert' : 'status'}
            className="fixed left-1/2 top-24 z-9999 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-orange-500 bg-neutral-950 p-5 text-white shadow-2xl"
        >
            <div className="flex items-start gap-3">
                {aviso.tipo === 'error'
                    ? <AlertCircle size={24} className="shrink-0 text-orange-400" />
                    : <CheckCircle2 size={24} className="shrink-0 text-orange-400" />}
                <div className="min-w-0 flex-1">
                    <p className="font-bold text-orange-400">
                        {aviso.tipo === 'error' ? 'Atención' : '¡Listo!'}
                    </p>
                    <p className="mt-1 wrap-break-word text-sm leading-6 text-white">{aviso.texto}</p>
                </div>
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
    );

    if (cargando) {
        return <>{notificacion}<p className="text-slate-500">Cargando carrito...</p></>;
    }

    return (
        <section className="space-y-8">
            <header>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">Tu reserva</p>
                <h1 className="mt-8 text-3xl font-black text-slate-900 sm:text-4xl">Carrito</h1>
                <p className="mt-3 text-slate-600">Revisá las personas antes de confirmar la reserva.</p>
            </header>

            {notificacion}

            {items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <p className="font-semibold text-slate-800">Tu carrito está vacío.</p>
                    <Link to="/excursiones" className="mt-4 inline-block font-semibold text-orange-600 hover:text-orange-700">
                        Ver excursiones
                    </Link>
                </div>
            ) : (
                <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
                    <div className="space-y-4">
                        {items.map((item) => (
                            <article key={item.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">{item.excursion?.nombre || 'Excursión'}</h2>
                                    <p className="mt-1 text-sm text-slate-500">${item.excursion?.precio} por persona</p>
                                    <p className="text-sm text-orange-700">Fecha: {item.salida?.fecha || item.excursion?.fecha?.slice(0,10) || 'Por confirmar'}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <label className="text-sm text-slate-600" htmlFor={`item-${item.id}`}>Personas</label>
                                    <input
                                        id={`item-${item.id}`}
                                        type="number"
                                        min="1"
                                        max={item.salida?.cupos ?? item.excursion?.cupos ?? undefined}
                                        value={item.cantidad}
                                        onChange={(event) => cambiarCantidad(item, Number(event.target.value))}
                                        className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-center"
                                    />
                                    <strong className="min-w-24 text-right text-slate-900">${Number(item.subtotal).toFixed(2)}</strong>
                                    <button type="button" onClick={() => eliminar(item.id)} className="text-sm font-semibold text-red-600 hover:text-red-700">
                                        Eliminar
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                    <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6">
                        <h2 className="text-lg font-bold text-slate-900">Resumen</h2>
                        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                            <span className="text-slate-600">Total</span>
                            <strong className="text-2xl text-slate-900">${total.toFixed(2)}</strong>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/checkout')}
                            disabled={procesando}
                            className="mt-6 w-full rounded-lg bg-orange-500 px-4 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                            Revisar y confirmar reserva
                        </button>
                    </aside>
                </div>
            )}

            <Link to="/mis-pedidos" className="mr-6 font-semibold text-orange-600">Ver mis reservas</Link>
            <button type="button" onClick={() => navigate('/excursiones')} className="text-sm font-semibold text-slate-600 hover:text-slate-900">
                Volver a excursiones
            </button>
        </section>
    );
}

export default Carrito;