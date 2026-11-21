import { useEffect, useState } from 'react';
import { adminApi } from '../../services/adminApi.js';
import { listarExcursiones } from '../../services/adminService.js';

const formatoFecha = fecha => fecha ? fecha.split('-').reverse().join('/') : '—';
const formatoHora = hora => hora ? String(hora).slice(0, 5) : '—';
const dinero = n => '$' + Number(n || 0).toLocaleString('es-AR');
const campo = 'w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-white focus:border-orange-500 focus:outline-none';

export default function AdminOcupacion() {
  const [excursiones, setExcursiones] = useState([]);
  const [idExcursion, setIdExcursion] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [estado, setEstado] = useState('TODAS');
  const [ocupacion, setOcupacion] = useState('TODAS');
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState({ items: [], total: 0, paginas: 0 });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [recargar, setRecargar] = useState(0);

  useEffect(() => {
    listarExcursiones()
      .then(res => setExcursiones(Array.isArray(res) ? res : res?.items || []))
      .catch(() => setExcursiones([]));
  }, []);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError('');
    adminApi.get('/reportes/ocupacion', {
      params: { idExcursion, desde, hasta, estado, ocupacion, pagina, limite: 10 },
    }).then(res => {
      if (vigente) setDatos(res);
    }).catch(err => {
      if (vigente) setError(err.message || 'No se pudo cargar el reporte');
    }).finally(() => {
      if (vigente) setCargando(false);
    });
    return () => { vigente = false; };
  }, [idExcursion, desde, hasta, estado, ocupacion, pagina, recargar]);

  const cambiar = (setter, valor) => { setter(valor); setPagina(1); };
  const limpiar = () => {
    setIdExcursion(''); setDesde(''); setHasta('');
    setEstado('TODAS'); setOcupacion('TODAS'); setPagina(1);
  };

  return (
    <section className="space-y-5 text-white">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Ocupación por salida</h2>
          <p className="mt-1 text-sm text-slate-400">Seguimiento de reservas, cupos y salidas dadas de baja. Para dar de baja una salida, ingresá a Gestión de reservas.</p>
        </div>
        <button type="button" onClick={() => setRecargar(n => n + 1)} className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700">Actualizar</button>
      </header>

      <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1 text-sm">Excursión
            <select className={campo} value={idExcursion} onChange={e => cambiar(setIdExcursion, e.target.value)}>
              <option value="">Todas las excursiones</option>
              {excursiones.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">Desde (fecha de salida)
            <input className={campo} type="date" value={desde} max={hasta || undefined} onChange={e => cambiar(setDesde, e.target.value)} />
          </label>
          <label className="space-y-1 text-sm">Hasta (fecha de salida)
            <input className={campo} type="date" value={hasta} min={desde || undefined} onChange={e => cambiar(setHasta, e.target.value)} />
          </label>
          <label className="space-y-1 text-sm">Estado de la salida
            <select className={campo} value={estado} onChange={e => cambiar(setEstado, e.target.value)}>
              <option value="TODAS">Todas</option>
              <option value="PROGRAMADA">Programadas</option>
              <option value="CANCELADA">Dadas de baja</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">Nivel de ocupación
            <select className={campo} value={ocupacion} onChange={e => cambiar(setOcupacion, e.target.value)}>
              <option value="TODAS">Todos</option>
              <option value="SIN_RESERVAS">Sin reservas</option>
              <option value="BAJO_MINIMO">Debajo del mínimo</option>
              <option value="MINIMO_ALCANZADO">Mínimo alcanzado</option>
              <option value="COMPLETA">Sin cupos</option>
            </select>
          </label>
          <div className="flex items-end">
            <button type="button" onClick={limpiar} className="rounded-lg border border-slate-600 px-4 py-2.5 text-sm hover:bg-slate-800">Limpiar filtros</button>
          </div>
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-700 bg-red-950/40 p-3 text-sm text-red-200">{error}</p>}
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>{cargando ? 'Actualizando reporte…' : `${datos.total} salida(s) encontrada(s)`}</span>
        <span>Las dadas de baja no tienen cupos vendibles</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full min-w-287.5 text-left text-sm">
          <thead className="bg-slate-800 text-slate-100">
            <tr>{['Excursión', 'Fecha / hora', 'Estado', 'Mín. / Máx.', 'Pendientes', 'Confirmados', 'Disponibles', 'Faltan al mínimo', 'Ocupación', 'Ventas confirmadas'].map(t => <th key={t} className="whitespace-nowrap px-3 py-4">{t}</th>)}</tr>
          </thead>
          <tbody>
            {(datos.items || []).map(x => {
              const baja = x.estadoSalida === 'CANCELADA';
              return (
                <tr key={x.id} className={`border-t border-slate-700 ${baja ? 'bg-red-950/20' : 'bg-slate-950/30'}`}>
                  <td className="px-3 py-4 font-medium">{x.excursion}</td>
                  <td className="whitespace-nowrap px-3 py-4">{formatoFecha(x.fecha)}<div className="text-xs text-slate-400">{formatoHora(x.horaSalida)}</div></td>
                  <td className="px-3 py-4">
                    <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${baja ? 'border-red-700 bg-red-950 text-red-200' : 'border-emerald-700 bg-emerald-950 text-emerald-200'}`}>
                      {baja ? 'Dada de baja' : 'Programada'}
                    </span>
                    {baja && <div className="mt-2 max-w-45 text-xs text-slate-400" title={x.motivoSuspension || ''}>{x.personasAfectadas} persona(s) en reservas afectadas</div>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4">{x.cupoMinimo} / {x.cupoMaximo}</td>
                  <td className="px-3 py-4">{baja ? '—' : x.pendientes}</td>
                  <td className="px-3 py-4">{baja ? '—' : x.confirmados}</td>
                  <td className="px-3 py-4 font-semibold">{baja ? <span className="text-red-300">No disponible</span> : x.disponibles}</td>
                  <td className="px-3 py-4">{baja ? 'No aplica' : x.faltanParaMinimo}</td>
                  <td className="px-3 py-4">
                    {baja ? <span className="text-slate-400">No aplica</span> : (
                      <div className="min-w-24 space-y-1">
                        <span>{x.porcentajeOcupacion ?? 0}%</span>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, x.porcentajeOcupacion || 0))}%` }} />
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4">{baja ? 'No aplica' : dinero(x.ventasConfirmadas)}</td>
                </tr>
              );
            })}
            {!cargando && !(datos.items || []).length && <tr><td colSpan={10} className="p-8 text-center text-slate-400">No hay salidas con estos filtros.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">Las cifras de ventas son operativas, no un reporte de reintegros. Las bajas y los mensajes se consultan en Gestión de reservas → Cancelaciones → Historial.</p>
      <div className="flex items-center justify-end gap-3 text-sm">
        <button type="button" className="rounded-lg bg-slate-800 px-3 py-2 disabled:opacity-40" disabled={pagina <= 1 || cargando} onClick={() => setPagina(p => p - 1)}>Anterior</button>
        <span>Página {pagina} de {Math.max(1, datos.paginas || 0)}</span>
        <button type="button" className="rounded-lg bg-slate-800 px-3 py-2 disabled:opacity-40" disabled={pagina >= (datos.paginas || 1) || cargando} onClick={() => setPagina(p => p + 1)}>Siguiente</button>
      </div>
    </section>
  );
}
