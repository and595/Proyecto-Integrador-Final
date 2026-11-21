import { Excursion, FechaExcursion } from '../models/index.js';
import { Op } from 'sequelize';

// GET /excursiones
export const obtener = async (req, res) => listarExcursiones(req, res, false);

// El administrador también puede ver excursiones aún sin fechas.
export const obtenerAdmin = async (req, res) => listarExcursiones(req, res, true);

const listarExcursiones = async (req, res, incluirSinSalidas) => {
    try {
        const busqueda = String(req.query.q || '').trim().slice(0, 100);
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 6));
        const where = busqueda ? { [Op.or]: [
            { nombre: { [Op.like]: `%${busqueda}%` } },
            { ubicacion: { [Op.like]: `%${busqueda}%` } },
            { descripcion: { [Op.like]: `%${busqueda}%` } },
        ] } : {};
        // Consultamos primero los IDs con fechas programadas para preservar
        // la paginación (un JOIN devolvería excursiones repetidas).
        let filtro = where;
        if (!incluirSinSalidas) {
            const salidas = await FechaExcursion.findAll({
                attributes: ['idExcursion'],
                where: { estadoSalida: 'PROGRAMADA', fecha: { [Op.gte]: new Date().toISOString().slice(0, 10) } },
                group: ['idExcursion'], raw: true,
            });
            filtro = { [Op.and]: [where, { id: { [Op.in]: salidas.map(s => s.idExcursion) } }] };
        }
        const { rows: data, count: total } = await Excursion.findAndCountAll({
            where: filtro, limit, offset: (page - 1) * limit,
            order: [['id', 'DESC']],
        });
        res.json({
            estado: true,
            data,
            paginacion: { pagina: page, limite: limit, total, paginas: Math.ceil(total / limit) },
        });
    } catch (error) {
        console.error('Error al obtener excursiones:', error);
        res.status(500).json({
            estado: false,
            mensaje: 'Error al obtener excursiones',
            error: error.message,
        });
    }
};

// GET /excursiones/:id
export const obtenerPorId = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const data = await Excursion.findByPk(id);

        if (!data) {
            return res.status(404).json({
                estado: false,
                mensaje: 'Excursión no encontrada',
            });
        }

        res.json({
            estado: true,
            data,
        });
    } catch (error) {
        console.error('Error al obtener excursión:', error);
        res.status(500).json({
            estado: false,
            mensaje: 'Error al obtener excursión',
            error: error.message,
        });
    }
};

// POST /excursiones
export const crear = async (req, res) => {
    try {
        // Fecha y cupos generales son columnas de compatibilidad.
        // Las salidas reales se crean exclusivamente desde /:id/fechas.
        const { id, fecha, cupos, ...datosGenerales } = req.body;
        const data = await Excursion.create({ ...datosGenerales, fecha: null, cupos: null });
        res.status(201).json({ estado: true, data });
    } catch (error) {
        console.error('Error al crear excursión:', error);
        res.status(400).json({ estado: false, mensaje: 'Error al crear excursión', error: error.message });
    }
};

// PUT /excursiones/:id
export const actualizar = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const excursion = await Excursion.findByPk(id);

        if (!excursion) {
            return res.status(404).json({
                estado: false,
                mensaje: 'Excursión no encontrada',
            });
        }

        if (req.body.cupos !== undefined && (!Number.isInteger(Number(req.body.cupos)) || Number(req.body.cupos) < 0)) {
            return res.status(400).json({ estado: false, mensaje: 'Cupos inválidos' });
        }
        const { fecha, cupos, id: _id, ...datosGenerales } = req.body;
        await excursion.update(datosGenerales);
        res.json({
            estado: true,
            data: excursion,
        });
    } catch (error) {
        console.error('Error al actualizar excursión:', error);
        res.status(400).json({
            estado: false,
            mensaje: 'Error al actualizar excursión',
            error: error.message,
        });
    }
};

// DELETE /excursiones/:id
export const eliminar = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const excursion = await Excursion.findByPk(id);

        if (!excursion) {
            return res.status(404).json({
                estado: false,
                mensaje: 'Excursión no encontrada',
            });
        }

        await excursion.destroy();
        res.json({
            estado: true,
            mensaje: 'Excursión eliminada correctamente',
        });
    } catch (error) {
        console.error('Error al eliminar excursión:', error);
        res.status(500).json({
            estado: false,
            mensaje: 'Error al eliminar excursión',
            error: error.message,
        });
    }
};