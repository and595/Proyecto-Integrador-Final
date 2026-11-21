import { ItemCarrito, Carrito, Excursion, FechaExcursion } from '../models/index.js';

// GET /itemsCarrito
// Obtiene solamente los items pertenecientes a carritos del usuario autenticado.
export const obtener = async (req, res) => {
    try {
        const data = await ItemCarrito.findAll({
            include: [
                {
                    model: Carrito,
                    as: 'carrito',
                    where: {
                        idUsuario: req.usuario.id,
                    },
                },
            ],
        });

        res.json({
            estado: true,
            data,
        });
    } catch (error) {
        console.error('Error al obtener itemsCarrito:', error);

        res.status(500).json({
            estado: false,
            mensaje: 'Error al obtener itemsCarrito',
            error: error.message,
        });
    }
};


// GET /itemsCarrito/:id
// Obtiene un item solamente si pertenece al usuario autenticado.
export const obtenerPorId = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);

        const data = await ItemCarrito.findOne({
            where: {
                id,
            },
            include: [
                {
                    model: Carrito,
                    as: 'carrito',
                    where: {
                        idUsuario: req.usuario.id,
                    },
                },
            ],
        });

        if (!data) {
            return res.status(404).json({
                estado: false,
                mensaje: 'ItemCarrito no encontrado',
            });
        }

        res.json({
            estado: true,
            data,
        });
    } catch (error) {
        console.error('Error al obtener itemCarrito:', error);

        res.status(500).json({
            estado: false,
            mensaje: 'Error al obtener itemCarrito',
            error: error.message,
        });
    }
};


// POST /itemsCarrito
// Crea un item solamente dentro de un carrito perteneciente al usuario.
export const crear = async (req, res) => {
    try {
        const { idCarrito, idExcursion, cantidad, idFechaExcursion } = req.body;

        // Verificamos que la cantidad sea válida.
        if (!Number.isInteger(Number(cantidad)) || Number(cantidad) <= 0) {
            return res.status(400).json({
                estado: false,
                mensaje: 'La cantidad debe ser un número entero mayor a 0',
            });
        }

        // Verificamos que el carrito pertenezca al usuario autenticado.
        const carrito = await Carrito.findOne({
            where: {
                id: idCarrito,
                idUsuario: req.usuario.id,
            },
        });

        if (!carrito) {
            return res.status(403).json({
                estado: false,
                mensaje: 'Carrito no encontradoo',
            });
        }

        if (carrito.estado === 'COMPRADO') {
            return res.status(400).json({
                estado: false,
                mensaje: 'El carrito ya fue comprado y no puede modificarse',
            });
        }

        // Buscamos la excursión para obtener su precio real.
        const excursion = await Excursion.findByPk(idExcursion);

        if (!excursion) {
            return res.status(404).json({
                estado: false,
                mensaje: 'Excursión no encontrada',
            });
        }

        const salidas = await FechaExcursion.findAll({ where: { idExcursion } });
        if (!idFechaExcursion) return res.status(400).json({ estado:false, mensaje:'Elegí una fecha de salida' });
        const salida = idFechaExcursion ? salidas.find(s => s.id === Number(idFechaExcursion)) : null;
        if (!salida) return res.status(400).json({ estado:false, mensaje:'Fecha no válida para esta excursión' });
        if (salida?.estadoSalida === 'CANCELADA') return res.status(409).json({ estado:false, mensaje:'Esta salida fue cancelada y no está disponible' });
        if (salida && salida.fecha < new Date().toISOString().slice(0,10)) return res.status(400).json({ estado:false, mensaje:'La fecha ya pasó' });
        const disponibles = Number(salida.cupos);
        if (!Number.isFinite(disponibles) || disponibles < Number(cantidad)) return res.status(400).json({ estado:false, mensaje:'Cupos insuficientes' });

        // Verificamos si la excursión ya existe en el carrito.
        const itemExistente = await ItemCarrito.findOne({
            where: {
                idCarrito,
                idExcursion,
                idFechaExcursion: idFechaExcursion || null,
            },
        });

        if (itemExistente) {
            // Si ya existe, aumentamos la cantidad.
            const nuevaCantidad =
                Number(itemExistente.cantidad) + Number(cantidad);

            if (nuevaCantidad > disponibles) return res.status(400).json({estado:false, mensaje:"Cupos insuficientes"});
            const subtotal =
                Number(excursion.precio) * nuevaCantidad;

            await itemExistente.update({
                cantidad: nuevaCantidad,
                subtotal,
            });

            return res.json({
                estado: true,
                mensaje: 'Cantidad actualizada en el carrito',
                data: itemExistente,
            });
        }

        // Si no existe, creamos un nuevo item.
        const subtotal =
            Number(excursion.precio) * Number(cantidad);

        const data = await ItemCarrito.create({
            idCarrito,
            idExcursion,
            idFechaExcursion: idFechaExcursion || null,
            cantidad,
            subtotal,
        });

        res.status(201).json({
            estado: true,
            data,
        });
    } catch (error) {
        console.error('Error al crear itemCarrito:', error);

        res.status(400).json({
            estado: false,
            mensaje: 'Error al crear itemCarrito',
            error: error.message,
        });
    }
};


// PUT /itemsCarrito/:id
// Actualiza solamente un item perteneciente al usuario autenticado.
export const actualizar = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);

        const itemCarrito = await ItemCarrito.findOne({
            where: {
                id,
            },
            include: [
                {
                    model: Carrito,
                    as: 'carrito',
                    where: {
                        idUsuario: req.usuario.id,
                    },
                },
            ],
        });

        if (!itemCarrito) {
            return res.status(404).json({
                estado: false,
                mensaje: 'ItemCarrito no encontrado',
            });
        }

        if (itemCarrito.carrito.estado === 'COMPRADO') {
            return res.status(400).json({
                estado: false,
                mensaje: 'El carrito ya fue comprado y no puede modificarse',
            });
        }

        const cantidad = Number(req.body.cantidad);

        if (!Number.isInteger(cantidad) || cantidad <= 0) {
            return res.status(400).json({
                estado: false,
                mensaje: 'La cantidad debe ser un número entero mayor a 0',
            });
        }

        // Buscamos la excursión asociada al item.
        const excursion = await Excursion.findByPk(
            itemCarrito.idExcursion
        );

        if (!excursion) {
            return res.status(404).json({
                estado: false,
                mensaje: 'Excursión no encontrada',
            });
        }

        const salida = itemCarrito.idFechaExcursion ? await FechaExcursion.findOne({where:{id:itemCarrito.idFechaExcursion,idExcursion:excursion.id}}) : null;
        const existentes = await FechaExcursion.count({where:{idExcursion:excursion.id}});
        if (salida?.estadoSalida === 'CANCELADA') return res.status(409).json({estado:false,mensaje:'Esta salida fue cancelada y no está disponible'});
        if (!salida || salida.fecha < new Date().toISOString().slice(0,10)) return res.status(400).json({estado:false,mensaje:'Fecha inválida'});
        const disponibles = Number(salida.cupos);
        if (!Number.isFinite(disponibles) || cantidad > disponibles) return res.status(400).json({estado:false,mensaje:'Cupos insuficientes'});
        const subtotal = Number(excursion.precio) * cantidad;

        await itemCarrito.update({
            cantidad,
            subtotal,
        });

        res.json({
            estado: true,
            data: itemCarrito,
        });
    } catch (error) {
        console.error('Error al actualizar itemCarrito:', error);

        res.status(400).json({
            estado: false,
            mensaje: 'Error al actualizar itemCarrito',
            error: error.message,
        });
    }
};


// DELETE /itemsCarrito/:id
// Elimina solamente un item perteneciente al usuario autenticado.
export const eliminar = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);

        const itemCarrito = await ItemCarrito.findOne({
            where: {
                id,
            },
            include: [
                {
                    model: Carrito,
                    as: 'carrito',
                    where: {
                        idUsuario: req.usuario.id,
                    },
                },
            ],
        });

        if (!itemCarrito) {
            return res.status(404).json({
                estado: false,
                mensaje: 'ItemCarrito no encontrado',
            });
        }

        if (itemCarrito.carrito.estado === 'COMPRADO') {
            return res.status(400).json({
                estado: false,
                mensaje: 'El carrito ya fue comprado y no puede modificarse',
            });
        }

        await itemCarrito.destroy();

        res.json({
            estado: true,
            mensaje: 'ItemCarrito eliminado correctamente',
        });
    } catch (error) {
        console.error('Error al eliminar itemCarrito:', error);

        res.status(500).json({
            estado: false,
            mensaje: 'Error al eliminar itemCarrito',
            error: error.message,
        });
    }
};