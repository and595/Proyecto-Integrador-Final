import { Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, X, Eye, Users, Clock3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buscarExcursiones, listarFechasPublicas } from '../services/excursionesService.js';
import { agregarAlCarrito } from '../services/carritoService.js';
import { agregarFavorito, listarFavoritos, quitarFavorito } from '../services/favoritosService.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

function obtenerUrlImagen(imagen) {
    const url = typeof imagen === 'string' ? imagen : imagen?.url;
    return url?.startsWith('/uploads/') ? `http://localhost:3000${url}` : (url || '');
}

function Excursiones() {
    const navigate = useNavigate();
    const { refrescar } = useCart();
    const { isAuthenticated, usuario } = useAuth();
    const [excursiones, setExcursiones] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [pagina, setPagina] = useState(1);
    const [paginas, setPaginas] = useState(1);
    const [favoritos, setFavoritos] = useState(new Set());
    const [favoritosUsuarioId, setFavoritosUsuarioId] = useState(null);
    const [favoritoProcesando, setFavoritoProcesando] = useState(null);
    const [cantidades, setCantidades] = useState({});
    const [salidasPorExcursion,setSalidasPorExcursion] = useState({});
    const [fechasElegidas,setFechasElegidas] = useState({});
    const [agregando, setAgregando] = useState(null);
    const [mensaje, setMensaje] = useState(null); // Mensaje flotante: texto y tipo
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    // Mostramos mensajes visibles sin mover la pantalla.
    const avisar = (texto, tipo = 'error') => {
        setMensaje({ texto, tipo, id: Date.now() });
    };

    // Cerramos el aviso después de cinco segundos.
    useEffect(() => {
        if (!mensaje) return;
        const tiempo = setTimeout(() => setMensaje(null), 5000);
        return () => clearTimeout(tiempo);
    }, [mensaje]);

    useEffect(() => {
        const cargarExcursiones = async () => {
            try {
                const { excursiones: data, paginacion } = await buscarExcursiones(busqueda, pagina);
                setExcursiones(data);
                const fechas = await Promise.all(data.map(async ex=>[ex.id,await listarFechasPublicas(ex.id)]));
                setSalidasPorExcursion(Object.fromEntries(fechas));
                setPaginas(paginacion?.paginas || 1);
            } catch (err) {
                setError(err.message || 'No se pudieron cargar las excursiones.');
            } finally {
                setCargando(false);
            }
        };

        cargarExcursiones();
    }, [busqueda, pagina]);

    useEffect(() => {
        if (!isAuthenticated) {
            return undefined;
        }

        let activo = true;
        const idUsuario = usuario?.id;

        listarFavoritos()
            .then((data) => {
                if (activo) {
                    setFavoritos(new Set(data.map((favorito) => favorito.idExcursion)));
                    setFavoritosUsuarioId(idUsuario);
                }
            })
            .catch((err) => {
                if (activo) avisar(err.response?.data?.mensaje || 'No se pudieron cargar tus favoritos.');
            })
            ;

        return () => {
            activo = false;
        };
    }, [isAuthenticated, usuario?.id]);

    const esFavorita = (idExcursion) => (
        favoritosUsuarioId === usuario?.id && favoritos.has(idExcursion)
    );

    const alternarFavorito = async (excursion) => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        const yaEsFavorita = esFavorita(excursion.id);
        setFavoritoProcesando(excursion.id);
        setMensaje(null);

        try {
            if (yaEsFavorita) {
                await quitarFavorito(excursion.id);
            } else {
                await agregarFavorito(excursion.id);
            }

            setFavoritos((actuales) => {
                const siguientes = new Set(actuales);
                if (yaEsFavorita) siguientes.delete(excursion.id);
                else siguientes.add(excursion.id);
                return siguientes;
            });
            avisar(yaEsFavorita ? 'Excursión quitada de favoritos.' : 'Excursión agregada a favoritos.', 'exito');
        } catch (err) {
            avisar(err.response?.data?.mensaje || 'No se pudo actualizar el favorito.');
        } finally {
            setFavoritoProcesando(null);
        }
    };

    const reservar = async (excursion) => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        const cantidad = Number(cantidades[excursion.id] || 1);
        const salidas = salidasPorExcursion[excursion.id] || [];
        const idFecha = fechasElegidas[excursion.id];
        if (!idFecha) { avisar('Elegí una fecha antes de reservar.'); return; }
        const salida = salidas.find(s=>s.id===Number(idFecha));
        const disponibles = salida?.estadoSalida === 'PROGRAMADA' ? Number(salida.cupos) : 0;
        if (!salida || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > disponibles) { avisar('La cantidad supera los cupos disponibles o la salida no está disponible.'); return; }
        setAgregando(excursion.id);
        setMensaje(null);

        try {
            await agregarAlCarrito(excursion.id, cantidad, idFecha);
            await refrescar();
            // Después de agregarla correctamente, vamos al carrito.
            navigate('/carrito', { state: { mensajeCarrito: `"${excursion.nombre}" se agregó al carrito.` } });
        } catch (err) {
            avisar(err.response?.data?.mensaje || err.message || 'No se pudo agregar al carrito.');
        } finally {
            setAgregando(null);
        }
    };

    return (
        <section className="space-y-8">
            <header>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
                    Descubre Córdoba
                </p>
                <h1 className="mt-8 text-3xl font-black text-slate-900 sm:text-4xl">
                    Elegí tu próxima experiencia
                </h1>
                <p className="mt-3 max-w-2xl text-slate-600">
                    Explorá excursiones, paisajes y actividades para disfrutar Córdoba.
                </p>
            </header>

            <label className="block max-w-lg text-sm font-semibold text-slate-700">Buscar excursiones
                <input type="search" value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                    placeholder="Nombre, ubicación o descripción" className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3" />
            </label>
            {cargando && <p className="text-slate-500">Cargando excursiones...</p>}

            {/* Avisos flotantes con los colores de Descubre Córdoba. */}
            {(error || mensaje) && (
                <div
                    role={error || mensaje?.tipo === 'error' ? 'alert' : 'status'}
                    className="fixed right-4 top-24 z-9999 flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-xl border border-orange-500 bg-neutral-950 p-4 text-white shadow-2xl"
                >
                    {error || mensaje?.tipo === 'error'
                        ? <AlertCircle size={22} className="shrink-0 text-orange-400" />
                        : <CheckCircle2 size={22} className="shrink-0 text-orange-400" />}
                    <div className="min-w-0 flex-1">
                        <p className="font-bold text-orange-400">
                            {error || mensaje?.tipo === 'error' ? 'Atención' : '¡Listo!'}
                        </p>
                        <p className="mt-1 wrap-break-word text-sm text-neutral-100">
                            {error || mensaje?.texto}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => { setError(''); setMensaje(null); }}
                        aria-label="Cerrar notificación"
                        className="rounded-lg bg-orange-500 p-2 text-white transition hover:bg-orange-600"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {!cargando && !error && excursiones.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <p className="font-semibold text-slate-800">Todavía no hay excursiones disponibles.</p>
                </div>
            )}

            
            {!cargando && !error && excursiones.length > 0 && (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {excursiones.map((excursion) => {
                        const imagen = obtenerUrlImagen(excursion.imagen);

                        return (
                            <article key={excursion.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <div className="relative">
                                    {imagen ? (
                                        <img
                                            src={imagen}
                                            alt={excursion.nombre}
                                            className="h-52 w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-52 items-center justify-center bg-slate-200 text-slate-500">
                                            Sin imagen
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => alternarFavorito(excursion)}
                                        disabled={(isAuthenticated && favoritosUsuarioId !== usuario?.id) || favoritoProcesando === excursion.id}
                                        aria-label={esFavorita(excursion.id) ? `Quitar ${excursion.nombre} de favoritos` : `Agregar ${excursion.nombre} a favoritos`}
                                        aria-pressed={esFavorita(excursion.id)}
                                        title={esFavorita(excursion.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                                        className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl text-red-600 shadow transition hover:scale-105 disabled:cursor-wait disabled:opacity-60"
                                    >
                                        {esFavorita(excursion.id) ? '♥' : '♡'}
                                    </button>
                                </div>

                                <div className="space-y-4 p-5">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">{excursion.nombre}</h2>
                                        <p className="mt-1 text-sm text-orange-600">{excursion.ubicacion}</p>
                                    </div>
                                    <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                                        {excursion.descripcion}
                                    </p>
                                    <Link to={`/excursiones/${excursion.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-orange-300 px-4 py-2 text-sm font-bold text-orange-700 hover:bg-orange-50"><Eye size={17}/> Ver detalles</Link>
                                    <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                                        <span className="font-semibold text-slate-900">${excursion.precio}</span>
                                        <span className="text-slate-500">{excursion.duracion || 'Duración a confirmar'}</span>
                                    </div>
                                    {(salidasPorExcursion[excursion.id] || []).length > 0 ? <label className="block text-sm font-semibold text-slate-700">Elegí una fecha
                                      <select className="mt-2 w-full rounded-xl border p-3" value={fechasElegidas[excursion.id] || ''} onChange={e=>setFechasElegidas(prev=>({...prev,[excursion.id]:Number(e.target.value)}))}>
                                        <option value="">Seleccionar fecha</option>
                                        {salidasPorExcursion[excursion.id].filter(s=>s.fecha>=new Date().toISOString().slice(0,10) && s.estadoSalida!=='CANCELADA').map(s=><option disabled={s.cupos===0} key={s.id} value={s.id}>{new Date(`${s.fecha}T12:00:00`).toLocaleDateString('es-AR', {day:'numeric', month:'long', year:'numeric'})}{s.horaSalida ? ` · ${s.horaSalida.slice(0,5)} hs` : ''}{Number(s.cupos)===0 ? ' · Agotada' : ''}</option>)}
                                      </select></label> : <p className="text-sm font-semibold text-slate-600">Sin próximas salidas</p>}
                                    {(() => { const salida = (salidasPorExcursion[excursion.id] || []).find(s => s.id === Number(fechasElegidas[excursion.id])); const disponibles = salida ? Number(salida.cupos) : null; return salida ? <p aria-live="polite" className={`flex items-center gap-2 text-sm font-semibold ${disponibles <= 10 ? 'text-orange-700' : 'text-emerald-700'}`}><Users size={17}/>{disponibles === 0 ? 'Agotado' : disponibles <= 10 ? `¡Quedan solo ${disponibles} lugares!` : `${disponibles} lugares disponibles`}</p> : null; })()}
                                    <div className="flex flex-wrap items-center gap-3">
                                        <label className="text-sm text-slate-600" htmlFor={`cantidad-${excursion.id}`}>
                                            Personas
                                        </label>
                                        <input
                                            id={`cantidad-${excursion.id}`}
                                            type="number"
                                            min="1"
                                            max={salidasPorExcursion[excursion.id]?.find(s=>s.id===Number(fechasElegidas[excursion.id]))?.cupos ?? 0}
                                            value={cantidades[excursion.id] || 1}
                                            onChange={(event) => setCantidades((actuales) => ({
                                                ...actuales,
                                                [excursion.id]: event.target.value,
                                            }))}
                                            className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-center"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => reservar(excursion)}
                                            disabled={agregando === excursion.id || !(salidasPorExcursion[excursion.id] || []).some(s=>s.id===Number(fechasElegidas[excursion.id]) && s.estadoSalida!=='CANCELADA' && s.fecha>=new Date().toISOString().slice(0,10) && Number(s.cupos)>0)}
                                            className="min-h-11 flex-1 rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                                        >
                                            {agregando === excursion.id ? 'Agregando...' : 'Reservar'}
                                        </button>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
            {!cargando && paginas > 1 && <nav aria-label="Paginación de excursiones" className="flex items-center justify-center gap-4">
                <button className="rounded-lg border px-4 py-2 disabled:opacity-40" disabled={pagina <= 1} onClick={() => setPagina(p => p-1)}>Anterior</button>
                <span>Página {pagina} de {paginas}</span>
                <button className="rounded-lg border px-4 py-2 disabled:opacity-40" disabled={pagina >= paginas} onClick={() => setPagina(p => p+1)}>Siguiente</button>
            </nav>}
        </section>
    );
}

export default Excursiones;