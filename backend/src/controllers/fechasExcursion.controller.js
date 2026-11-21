
import {
  Excursion,
  FechaExcursion,
  DetalleCompra,
  Compra,
  ItemCarrito,
} from "../models/index.js";

import sequelize from "../config/database.js";
import { Op } from "sequelize";

// =====================================================
// FUNCIÓN AUXILIAR: CALCULAR OCUPACIÓN DE UNA SALIDA
// =====================================================

// Calcula cuántas personas tienen reservas activas
// para una fecha determinada.
//
// No cuenta las reservas canceladas.
//
// La transacción es opcional y se utiliza cuando
// necesitamos modificar datos de forma segura.

const ocupacion = async (id, transaction) => {
  const items = await DetalleCompra.findAll({
    where: {
      idFechaExcursion: id,
    },
    include: [
      {
        model: Compra,
        as: "compra",
        attributes: ["estado"],
        required: true,
      },
    ],
    transaction,
  });

  // El estado del detalle tiene prioridad.
  // Para registros antiguos sin estado propio,
  // utilizamos el estado general de la compra.

  return items
    .filter((item) =>
      ["PENDIENTE", "CONFIRMADA", "REPROGRAMADA"].includes(
        item.estado ?? item.compra?.estado
      )
    )
    .reduce(
      (total, item) => total + Number(item.cantidad),
      0
    );
};

// =====================================================
// LISTAR FECHAS DE UNA EXCURSIÓN
// =====================================================

// Devuelve todas las fechas asociadas a una excursión,
// ordenadas desde la más antigua a la más reciente.
//
// Además, calcula la cantidad de lugares reservados
// para cada salida.

export async function listar(req, res) {
  try {
    const data = await FechaExcursion.findAll({
      where: {
        idExcursion: req.params.id,
      },
      order: [["fecha", "ASC"]],
    });

    const fechasConOcupacion = await Promise.all(
      data.map(async (salida) => ({
        ...salida.toJSON(),
        reservados: await ocupacion(salida.id),
      }))
    );

    res.json({
      estado: true,
      data: fechasConOcupacion,
    });
  } catch (error) {
    res.status(500).json({
      estado: false,
      mensaje: error.message,
    });
  }
}

// =====================================================
// VALIDAR FECHA Y CUPOS
// =====================================================

// Comprueba que:
// - La fecha tenga formato AAAA-MM-DD.
// - El mínimo sea un entero mayor o igual a 1.
// - El máximo sea un entero mayor o igual al mínimo.
//
// IMPORTANTE:
// Esta función valida el formato, pero no comprueba
// que la fecha exista realmente ni que sea futura.

const validar = (fecha, min, max) => {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(String(fecha)) &&
    Number.isInteger(min) &&
    min >= 1 &&
    Number.isInteger(max) &&
    max >= min
  );
};

// =====================================================
// AGREGAR UNA NUEVA FECHA A UNA EXCURSIÓN
// =====================================================

// Primero verifica que exista la excursión.
//
// Después valida la fecha y los cupos.
//
// Si no hay otra salida con la misma fecha,
// crea el registro en FechaExcursion.

export async function guardar(req, res) {
  try {
    const excursion = await Excursion.findByPk(
      req.params.id
    );

    if (!excursion) {
      return res.status(404).json({
        estado: false,
        mensaje: "Excursión inexistente",
      });
    }

    const { fecha } = req.body;
    const horaSalida = req.body.horaSalida || null;
    if (horaSalida && !/^([01]\d|2[0-3]):[0-5]\d$/.test(horaSalida)) return res.status(400).json({estado:false,mensaje:"Hora de salida inválida"});

    const max = Number(
      req.body.cupoMaximo ?? req.body.cupos
    );

    const min = Number(req.body.cupoMinimo ?? 1);

    // Validamos fecha y capacidad.

    if (!validar(fecha, min, max)) {
      return res.status(400).json({
        estado: false,
        mensaje: "Fecha o cupos mínimo/máximo inválidos",
      });
    }

    // Evitamos duplicar una salida con la misma fecha y hora.

    const fechaExistente = await FechaExcursion.findOne({
      where: {
        idExcursion: excursion.id,
        fecha,
        horaSalida,
      },
    });

    if (fechaExistente) {
      return res.status(409).json({
        estado: false,
        mensaje: "Esta fecha ya existe",
      });
    }

    // Creamos la nueva salida.
    // Inicialmente, todos los cupos están disponibles.

    const data = await FechaExcursion.create({
      idExcursion: excursion.id,
      fecha,
      horaSalida,
      cupos: max,
      cupoMinimo: min,
      cupoMaximo: max,
    });

    res.status(201).json({
      estado: true,
      data,
    });
  } catch (error) {
    res.status(400).json({
      estado: false,
      mensaje: error.message,
    });
  }
}

// =====================================================
// EDITAR UNA FECHA EXISTENTE
// =====================================================

// Permite modificar la fecha y los cupos.
//
// Utiliza una transacción para mantener consistentes
// los cambios mientras se actualiza la salida.
//
// No permite establecer una capacidad máxima menor
// que la cantidad de personas ya reservadas.

export async function editarFecha(req, res) {
  const transaction = await sequelize.transaction();

  try {
    // Buscamos la salida y bloqueamos su registro
    // mientras se realiza la modificación.

    const salida = await FechaExcursion.findOne({
      where: {
        id: req.params.fechaId,
        idExcursion: req.params.id,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!salida) {
      await transaction.rollback();

      return res.status(404).json({
        estado: false,
        mensaje: "Salida inexistente",
      });
    }

    // Si no se recibe otra fecha, conservamos la actual.

    const fecha = req.body.fecha ?? salida.fecha;
    const horaSalida = req.body.horaSalida !== undefined ? (req.body.horaSalida || null) : salida.horaSalida;
    if (horaSalida && !/^([01]\d|2[0-3]):[0-5]\d$/.test(horaSalida)) {
      await transaction.rollback();
      return res.status(400).json({estado:false,mensaje:"Hora de salida inválida"});
    }

    // Calculamos cuántos lugares están reservados.

    const ocupados = await ocupacion(
      salida.id,
      transaction
    );

    // Obtenemos los nuevos cupos o mantenemos los actuales.

    const max = Number(
      req.body.cupoMaximo ??
        salida.cupoMaximo ??
        Number(salida.cupos) + ocupados
    );

    const min = Number(
      req.body.cupoMinimo ??
        salida.cupoMinimo ??
        1
    );

    // La capacidad máxima no puede ser menor
    // que los lugares ya ocupados.

    if (!validar(fecha, min, max) || max < ocupados) {
      await transaction.rollback();

      return res.status(400).json({
        estado: false,
        mensaje:
          "La capacidad debe cubrir los lugares ya reservados y el mínimo",
      });
    }

    // Verificamos que otra salida de la misma excursión
    // no tenga esa fecha y hora.

    const fechaRepetida = await FechaExcursion.findOne({
      where: {
        idExcursion: salida.idExcursion,
        fecha,
        horaSalida,
        id: {
          [Op.ne]: salida.id,
        },
      },
      transaction,
    });

    if (fechaRepetida) {
      await transaction.rollback();

      return res.status(409).json({
        estado: false,
        mensaje: "Ya existe esta fecha",
      });
    }

    // Actualizamos la salida.
    // Los cupos disponibles se calculan restando
    // las personas reservadas al máximo permitido.

    await salida.update(
      {
        fecha,
        horaSalida,
        cupoMinimo: min,
        cupoMaximo: max,
        cupos: max - ocupados,
      },
      { transaction }
    );

    // Confirmamos la operación.

    await transaction.commit();

    res.json({
      estado: true,
      data: salida,
    });
  } catch (error) {
    // Si ocurre un error, deshacemos los cambios.

    if (!transaction.finished) {
      await transaction.rollback();
    }

    res.status(400).json({
      estado: false,
      mensaje: error.message,
    });
  }
}

// =====================================================
// ELIMINAR UNA FECHA DE EXCURSIÓN
// =====================================================

// Permite eliminar una fecha solamente cuando
// no tiene reservas ni carritos asociados.
//
// Evita borrar información que todavía está
// relacionada con otras tablas del sistema.

export async function eliminarFecha(req, res) {
  try {
    const salida = await FechaExcursion.findOne({
      where: {
        id: req.params.fechaId,
        idExcursion: req.params.id,
      },
    });

    if (!salida) {
      return res.status(404).json({
        estado: false,
        mensaje: "Fecha inexistente",
      });
    }

    // Contamos los detalles de compra asociados.

    const compras = await DetalleCompra.count({
      where: {
        idFechaExcursion: salida.id,
      },
    });

    // Contamos los carritos que utilizan esta salida.

    const items = await ItemCarrito.count({
      where: {
        idFechaExcursion: salida.id,
      },
    });

    // Si existen relaciones, impedimos eliminarla.

    if (compras || items) {
      return res.status(409).json({
        estado: false,
        mensaje:
          "La fecha tiene reservas o carritos asociados",
      });
    }

    // Eliminamos la salida si no tiene relaciones.

    await salida.destroy();

    res.json({
      estado: true,
    });
  } catch (error) {
    res.status(500).json({
      estado: false,
      mensaje: error.message,
    });
  }
}