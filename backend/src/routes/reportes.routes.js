import { Router } from 'express';
import { Op } from 'sequelize';
import { verificarAdmin } from '../middleware/auth.js';
import { verificarPermiso } from '../middleware/permisos.js';
import { FechaExcursion, Excursion, DetalleCompra, Compra } from '../models/index.js';

const router = Router();
const ESTADOS_ACTIVOS = ['PENDIENTE', 'CONFIRMADA', 'REPROGRAMADA'];
const sumar = (items) => items.reduce((total, d) => total + Number(d.cantidad || 0), 0);
const fechaValida = valor => /^\d{4}-\d{2}-\d{2}$/.test(String(valor || ''));

// Reporte administrativo: NO altera reservas, pagos ni cupos.
router.get('/ocupacion', verificarAdmin, verificarPermiso('reservas.leer'), async (req, res) => {
  try {
    const pagina = Math.max(1, Number.parseInt(req.query.pagina, 10) || 1);
    const limite = Math.min(100, Math.max(1, Number.parseInt(req.query.limite, 10) || 10));
    const where = {};

    if (req.query.idExcursion) {
      const id = Number(req.query.idExcursion);
      if (!Number.isInteger(id) || id < 1) return res.status(400).json({ estado: false, mensaje: 'Excursión inválida' });
      where.idExcursion = id;
    }
    if (req.query.idFechaExcursion) {
      const id = Number(req.query.idFechaExcursion);
      if (!Number.isInteger(id) || id < 1) return res.status(400).json({ estado: false, mensaje: 'Salida inválida' });
      where.id = id;
    }
    const desde = req.query.desde || req.query.fecha || '';
    const hasta = req.query.hasta || '';
    if ((desde && !fechaValida(desde)) || (hasta && !fechaValida(hasta)) || (desde && hasta && desde > hasta)) {
      return res.status(400).json({ estado: false, mensaje: 'Rango de fechas inválido' });
    }
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha[Op.gte] = desde;
      if (hasta) where.fecha[Op.lte] = hasta;
    }

    const estado = String(req.query.estado || 'TODAS').toUpperCase();
    if (!['TODAS', 'PROGRAMADA', 'CANCELADA'].includes(estado)) {
      return res.status(400).json({ estado: false, mensaje: 'Estado de salida inválido' });
    }
    if (estado !== 'TODAS') where.estadoSalida = estado;

    const ocupacion = String(req.query.ocupacion || 'TODAS').toUpperCase();
    if (!['TODAS', 'SIN_RESERVAS', 'BAJO_MINIMO', 'MINIMO_ALCANZADO', 'COMPLETA'].includes(ocupacion)) {
      return res.status(400).json({ estado: false, mensaje: 'Filtro de ocupación inválido' });
    }

    const salidas = await FechaExcursion.findAll({
      where,
      include: [{ model: Excursion, as: 'excursion', attributes: ['id', 'nombre'] }],
      order: [['fecha', 'ASC'], ['id', 'ASC']],
    });

    const resultados = await Promise.all(salidas.map(async salida => {
      const detalles = await DetalleCompra.findAll({
        where: { idFechaExcursion: salida.id },
        include: [{ model: Compra, as: 'compra', required: true, attributes: ['estado'] }],
      });
      // El estado del detalle tiene prioridad; la compra es respaldo para datos antiguos.
      const estadoDetalle = d => d.estado ?? d.compra?.estado;
      const baja = salida.estadoSalida === 'CANCELADA';
      const pendientesOriginales = sumar(detalles.filter(d => estadoDetalle(d) === 'PENDIENTE'));
      const confirmadosOriginales = sumar(detalles.filter(d => ['CONFIRMADA', 'REPROGRAMADA'].includes(estadoDetalle(d))));
      const comprometidos = baja ? 0 : pendientesOriginales + confirmadosOriginales;
      const maximo = Number(salida.cupoMaximo ?? (Number(salida.cupos || 0) + comprometidos));
      const minimo = Number(salida.cupoMinimo ?? 1);
      const disponibles = baja ? 0 : Math.max(0, Number(salida.cupos || 0));
      const ventasConfirmadas = baja ? 0 : detalles
        .filter(d => ['CONFIRMADA', 'REPROGRAMADA'].includes(estadoDetalle(d)))
        .reduce((total, d) => total + Number(d.precioUnitario || 0) * Number(d.cantidad || 0), 0);

      return {
        id: salida.id,
        idExcursion: salida.idExcursion,
        excursion: salida.excursion?.nombre || 'Excursión sin nombre',
        fecha: salida.fecha,
        horaSalida: salida.horaSalida || null,
        estadoSalida: salida.estadoSalida,
        cupoMinimo: minimo,
        cupoMaximo: maximo,
        pendientes: baja ? 0 : pendientesOriginales,
        confirmados: baja ? 0 : confirmadosOriginales,
        comprometidos,
        disponibles,
        faltanParaMinimo: baja ? null : Math.max(0, minimo - comprometidos),
        porcentajeOcupacion: baja || maximo <= 0 ? null : Math.round((comprometidos / maximo) * 100),
        ventasConfirmadas,
        // Para el historial de bajas: personas/reservas afectadas, no ocupación activa.
        reservasAfectadas: baja ? detalles.filter(d => ESTADOS_ACTIVOS.includes(estadoDetalle(d))).length : 0,
        personasAfectadas: baja ? sumar(detalles.filter(d => ESTADOS_ACTIVOS.includes(estadoDetalle(d)))) : 0,
        motivoSuspension: baja ? (salida.motivoSuspension || null) : null,
      };
    }));

    const filtrados = resultados.filter(x => {
      if (ocupacion === 'TODAS') return true;
      // Los indicadores de ocupación son solo para salidas programadas.
      if (x.estadoSalida === 'CANCELADA') return false;
      if (ocupacion === 'SIN_RESERVAS') return x.comprometidos === 0;
      if (ocupacion === 'BAJO_MINIMO') return x.comprometidos > 0 && x.comprometidos < x.cupoMinimo;
      if (ocupacion === 'MINIMO_ALCANZADO') return x.comprometidos >= x.cupoMinimo && x.disponibles > 0;
      if (ocupacion === 'COMPLETA') return x.disponibles === 0;
      return true;
    });
    const total = filtrados.length;
    res.json({
      estado: true,
      data: {
        items: filtrados.slice((pagina - 1) * limite, pagina * limite),
        total,
        pagina,
        paginas: Math.ceil(total / limite),
      },
    });
  } catch (error) {
    console.error('Reporte ocupación:', error);
    res.status(500).json({ estado: false, mensaje: 'Error al obtener ocupación' });
  }
});

export default router;
