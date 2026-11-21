
/*
==================================================
 DESCUBRE CÓRDOBA - HACKATHON GRUPO 9
 CONTROLADOR DE SOLICITUDES DE CANCELACIÓN
==================================================

Este controlador permite:

CLIENTE:
- Solicitar la cancelación de una reserva.
- Consultar sus solicitudes.

ADMINISTRADOR:
- Consultar todas las solicitudes.
- Aceptar, rechazar o reprogramar reservas.
- Suspender una salida y avisar a los clientes.

Trabajamos con DetalleCompra porque una compra
puede contener varias reservas diferentes.
*/


// ================================================
// 1. IMPORTACIONES
// ================================================

// Importamos Sequelize para utilizar transacciones
// y mantener consistentes los cambios en la base de datos.
import sequelize from '../config/database.js';

// Importamos los modelos de la base de datos.
import {
  DetalleCompra,
  Compra,
  FechaExcursion,
  Mensaje,
  SolicitudCancelacion,
  Excursion,
  Usuario
} from '../models/index.js';

// Importamos los servicios de correo electrónico.
// enviarCambioEstado está importado pero no se utiliza aquí.
import {
  enviarAvisoMensaje,
  enviarCambioEstado
} from '../services/email.service.js';


// ================================================
// 2. FUNCIONES AUXILIARES
// ================================================

// Verifica si una reserva está vigente.
//
// includes() comprueba si el estado está en la lista.
// Devuelve true o false.
const activo = d =>
  ['PENDIENTE', 'CONFIRMADA', 'REPROGRAMADA']
    .includes(d.estado || d.compra?.estado);


// Crea un error con un mensaje y código HTTP.
// Si no indicamos un código, utiliza 400.
const error = (msg, status = 400) =>
  Object.assign(new Error(msg), { status });


// Envía un correo relacionado con una reserva.
async function correoDetalle(detalle, texto) {
  try {

    // Buscamos la compra a la que pertenece la reserva.
    const compra = await Compra.findByPk(detalle.idCompra);

    // Buscamos al cliente que realizó esa compra.
    const cliente = compra &&
      await Usuario.findByPk(compra.idUsuario);

    // Si tiene correo, enviamos el aviso.
    if (cliente?.email) {
      await enviarAvisoMensaje({
        destinatario: cliente.email,
        texto,
        idDetalle: detalle.id
      });
    }

  } catch (e) {

    // Si falla el envío, mostramos el error en consola.
    console.error('Email no enviado:', e.message);

  }
}


// ================================================
// 3. CLIENTE - SOLICITAR CANCELACIÓN
// ================================================

// El cliente solicita cancelar una reserva.
//
// IMPORTANTE:
// No cambiamos el estado de la reserva.
// Solamente creamos una solicitud para que
// posteriormente la revise un administrador.
export async function solicitar(req, res) {
  try {

    // Buscamos la reserva mediante su ID.
    // include trae también la compra relacionada.
    const detalle = await DetalleCompra.findByPk(
      req.params.idDetalle,
      {
        include: [
          {
            model: Compra,
            as: 'compra'
          }
        ]
      }
    );

    // Comprobamos que la reserva exista
    // y pertenezca al cliente que inició sesión.
    if (
      !detalle ||
      Number(detalle.compra?.idUsuario) !==
        Number(req.usuario.id)
    ) {
      throw error('Reserva no encontrada', 404);
    }

    // Verificamos que la reserva siga vigente.
    if (!activo(detalle)) {
      throw error('La reserva no está vigente');
    }

    // Obtenemos el motivo enviado desde el frontend.
    // trim() elimina espacios al inicio y al final.
    const motivo = String(req.body.motivo || '').trim();

    // Validamos que tenga entre 10 y 2000 caracteres.
    if (motivo.length < 10 || motivo.length > 2000) {
      throw error(
        'Indicá un motivo entre 10 y 2000 caracteres'
      );
    }

    // Buscamos si ya existe una solicitud pendiente.
    const abierta = await SolicitudCancelacion.findOne({
      where: {
        idDetalleCompra: detalle.id,
        estado: 'EN_EVALUACION'
      }
    });

    // Evitamos solicitudes duplicadas en evaluación.
    if (abierta) {
      throw error(
        'Ya tenés una solicitud en evaluación',
        409
      );
    }

    // Creamos la solicitud en la base de datos.
    const solicitud = await SolicitudCancelacion.create({
      idDetalleCompra: detalle.id,
      motivo
    });

    // Guardamos un mensaje dentro de la reserva.
    await Mensaje.create({
      idDetalleCompra: detalle.id,
      emisorTipo: 'CLIENTE',
      emisorId: req.usuario.id,
      contenido: `Solicitud de cancelación: ${motivo}`
    });

    // Respondemos al frontend.
    // HTTP 201 significa que se creó correctamente.
    res.status(201).json({
      estado: true,
      data: solicitud
    });

  } catch (e) {

    // Si ocurre un error, enviamos el mensaje.
    res.status(e.status || 500).json({
      estado: false,
      mensaje: e.message
    });

  }
}


// ================================================
// 4. CLIENTE - CONSULTAR MIS SOLICITUDES
// ================================================

// Busca las solicitudes que pertenecen
// al cliente que inició sesión.
export async function misSolicitudes(req, res) {
  try {

    const datos = await SolicitudCancelacion.findAll({
      include: [
        {
          model: DetalleCompra,
          as: 'detalle',
          required: true,

          include: [
            {
              model: Compra,
              as: 'compra',

              // Filtramos por el cliente autenticado.
              where: {
                idUsuario: req.usuario.id
              },

              required: true
            }
          ]
        }
      ],

      // Ordenamos desde la más reciente.
      order: [['fechaSolicitud', 'DESC']]
    });

    // Enviamos las solicitudes al frontend.
    res.json({
      estado: true,
      data: datos
    });

  } catch (e) {

    res.status(500).json({
      estado: false,
      mensaje: e.message
    });

  }
}


// ================================================
// 5. ADMINISTRADOR - LISTAR SOLICITUDES
// ================================================

// Permite consultar hasta 200 solicitudes
// ordenadas desde la más reciente.
export async function listarSolicitudes(req, res) {
  try {

    const solicitudes = await SolicitudCancelacion.findAll({
      order: [['fechaSolicitud', 'DESC']],
      limit: 200
    });

    res.json({
      estado: true,
      data: solicitudes
    });

  } catch (e) {

    res.status(500).json({
      estado: false,
      mensaje: e.message
    });

  }
}


// ================================================
// 6. ADMINISTRADOR - RESOLVER SOLICITUD
// ================================================

// El administrador puede:
//
// ACEPTADA:
// Cancela la reserva y devuelve los cupos.
//
// RECHAZADA:
// Rechaza la solicitud y mantiene la reserva.
//
// REPROGRAMADA:
// Cambia la fecha y actualiza los cupos.
//
// Utilizamos una transacción para que los cambios
// se confirmen juntos o se reviertan si hay un error.
export async function resolver(req, res) {

  // Iniciamos una transacción de Sequelize.
  const t = await sequelize.transaction();

  let detalle;

  try {

    // --------------------------------------------
    // PASO 1: BUSCAR LA SOLICITUD
    // --------------------------------------------

    const s = await SolicitudCancelacion.findByPk(
      req.params.id,
      {
        transaction: t,
        lock: t.LOCK.UPDATE
      }
    );

    // Verificamos que exista y esté en evaluación.
    if (!s || s.estado !== 'EN_EVALUACION') {
      throw error(
        'Solicitud inexistente o ya resuelta',
        409
      );
    }


    // --------------------------------------------
    // PASO 2: VALIDAR LA DECISIÓN
    // --------------------------------------------

    // Convertimos la decisión a mayúsculas.
    const decision = String(
      req.body.decision || ''
    ).toUpperCase();

    // Comprobamos que sea una opción válida.
    if (
      !['ACEPTADA', 'RECHAZADA', 'REPROGRAMADA']
        .includes(decision)
    ) {
      throw error('Resolución inválida');
    }

    // Obtenemos la explicación del administrador.
    const resolucion = String(
      req.body.resolucion || ''
    ).trim();

    if (resolucion.length < 5) {
      throw error('Escribí la resolución');
    }


    // --------------------------------------------
    // PASO 3: BUSCAR Y VALIDAR LA RESERVA
    // --------------------------------------------

    detalle = await DetalleCompra.findByPk(
      s.idDetalleCompra,
      {
        transaction: t,
        lock: t.LOCK.UPDATE
      }
    );

    if (!detalle) {
      throw error('Reserva inexistente', 404);
    }

    // Buscamos la compra relacionada.
    const compra = await Compra.findByPk(
      detalle.idCompra,
      {
        transaction: t
      }
    );

    // Comprobamos que la reserva esté vigente.
    if (!activo({ ...detalle.dataValues, compra })) {
      throw error('Reserva no vigente', 409);
    }


    // --------------------------------------------
    // PASO 4: SI LA SOLICITUD ES ACEPTADA
    // --------------------------------------------

    if (decision === 'ACEPTADA') {

      // Si tiene una fecha de excursión asociada,
      // devolvemos los cupos a esa salida.
      if (detalle.idFechaExcursion) {

        const salida = await FechaExcursion.findByPk(
          detalle.idFechaExcursion,
          {
            transaction: t,
            lock: t.LOCK.UPDATE
          }
        );

        if (salida) {
          await salida.update(
            {
              // Sumamos los cupos sin superar el máximo.
              cupos: Math.min(
                Number(salida.cupoMaximo ?? Infinity),
                Number(salida.cupos) +
                  Number(detalle.cantidad)
              )
            },
            {
              transaction: t
            }
          );
        }

      } else {

        // Si no tiene fecha asociada, devolvemos
        // los cupos a la excursión general.
        const e = await Excursion.findByPk(
          detalle.idExcursion,
          {
            transaction: t,
            lock: t.LOCK.UPDATE
          }
        );

        if (e) {
          await e.increment('cupos', {
            by: Number(detalle.cantidad),
            transaction: t
          });
        }
      }

      // Marcamos la reserva como cancelada.
      await detalle.update(
        {
          estado: 'CANCELADA'
        },
        {
          transaction: t
        }
      );

    }


    // --------------------------------------------
    // PASO 5: SI LA SOLICITUD ES REPROGRAMADA
    // --------------------------------------------

    if (decision === 'REPROGRAMADA') {

      // Buscamos la nueva fecha seleccionada.
      const nueva = await FechaExcursion.findByPk(
        Number(req.body.idNuevaFecha),
        {
          transaction: t,
          lock: t.LOCK.UPDATE
        }
      );

      // Comprobamos:
      // - Que la fecha exista.
      // - Que sea de la misma excursión.
      // - Que no esté cancelada.
      // - Que tenga suficientes cupos.
      if (
        !nueva ||
        Number(nueva.idExcursion) !==
          Number(detalle.idExcursion) ||
        nueva.estadoSalida === 'CANCELADA' ||
        Number(nueva.cupos) < Number(detalle.cantidad)
      ) {
        throw error('Nueva fecha no disponible');
      }

      // Si había una fecha anterior,
      // le devolvemos los cupos utilizados.
      if (detalle.idFechaExcursion) {

        const anterior = await FechaExcursion.findByPk(
          detalle.idFechaExcursion,
          {
            transaction: t,
            lock: t.LOCK.UPDATE
          }
        );

        if (anterior) {
          await anterior.increment('cupos', {
            by: Number(detalle.cantidad),
            transaction: t
          });
        }
      }

      // Descontamos los cupos de la nueva fecha.
      await nueva.decrement('cupos', {
        by: Number(detalle.cantidad),
        transaction: t
      });

      // Actualizamos la fecha y el estado de la reserva.
      await detalle.update(
        {
          idFechaExcursion: nueva.id,
          estado: 'REPROGRAMADA'
        },
        {
          transaction: t
        }
      );

    }


    // --------------------------------------------
    // PASO 6: GUARDAR LA RESOLUCIÓN
    // --------------------------------------------

    // Guardamos la decisión, su explicación,
    // la fecha y el administrador responsable.
    await s.update(
      {
        estado: decision,
        resolucion,
        fechaResolucion: new Date(),
        idAdminResolutor: req.usuarioAdmin.id
      },
      {
        transaction: t
      }
    );


    // --------------------------------------------
    // PASO 7: REGISTRAR EL MENSAJE
    // --------------------------------------------

    // Guardamos la resolución dentro del chat.
    await Mensaje.create(
      {
        idDetalleCompra: detalle.id,
        emisorTipo: 'ADMIN',
        emisorId: req.usuarioAdmin.id,
        contenido:
          `Resolución de solicitud: ${decision}. ${resolucion}`
      },
      {
        transaction: t
      }
    );


    // --------------------------------------------
    // PASO 8: CONFIRMAR Y NOTIFICAR
    // --------------------------------------------

    // commit() guarda definitivamente los cambios.
    await t.commit();

    // Intentamos enviar un correo al cliente.
    await correoDetalle(detalle, resolucion);

    // Respondemos al frontend.
    res.json({
      estado: true,
      data: s
    });

  } catch (e) {

    // Si falla antes del commit,
    // rollback() revierte los cambios.
    if (!t.finished) {
      await t.rollback();
    }

    res.status(e.status || 500).json({
      estado: false,
      mensaje: e.message
    });

  }
}


// ================================================
// 7. ADMINISTRADOR - CANCELAR UNA SALIDA
// ================================================

// Permite suspender una salida de excursión.
//
// Busca las reservas vigentes afectadas,
// registra un mensaje para cada una
// e intenta enviar avisos por correo.
//
// IMPORTANTE:
// Esta función cancela la salida,
// pero NO cambia el estado de cada DetalleCompra.
export async function cancelarSalida(req, res) {

  // Iniciamos una transacción.
  const t = await sequelize.transaction();

  // Guardaremos los ID de las reservas afectadas.
  let ids = [];

  try {

    // --------------------------------------------
    // PASO 1: VALIDAR EL MOTIVO
    // --------------------------------------------

    const motivo = String(
      req.body.motivo || ''
    ).trim();

    if (motivo.length < 10) {
      throw error('Indicá el motivo de suspensión');
    }


    // --------------------------------------------
    // PASO 2: BUSCAR LA SALIDA
    // --------------------------------------------

    const salida = await FechaExcursion.findByPk(
      req.params.fechaId,
      {
        transaction: t,
        lock: t.LOCK.UPDATE
      }
    );

    // Verificamos que exista y no esté cancelada.
    if (
      !salida ||
      salida.estadoSalida === 'CANCELADA'
    ) {
      throw error(
        'Salida inexistente o ya cancelada',
        409
      );
    }


    // --------------------------------------------
    // PASO 3: BUSCAR LAS RESERVAS AFECTADAS
    // --------------------------------------------

    const detalles = await DetalleCompra.findAll({
      where: {
        idFechaExcursion: salida.id
      },

      include: [
        {
          model: Compra,
          as: 'compra'
        }
      ],

      transaction: t
    });

    // Filtramos solamente las reservas vigentes.
    const vigentes = detalles.filter(activo);


    // --------------------------------------------
    // PASO 4: SUSPENDER LA SALIDA
    // --------------------------------------------

    await salida.update(
      {
        estadoSalida: 'CANCELADA',
        motivoSuspension: motivo
      },
      {
        transaction: t
      }
    );


    // --------------------------------------------
    // PASO 5: REGISTRAR LOS MENSAJES
    // --------------------------------------------

    // Recorremos cada reserva afectada.
    for (const d of vigentes) {

      // Creamos un mensaje para informar la suspensión.
      await Mensaje.create(
        {
          idDetalleCompra: d.id,
          emisorTipo: 'ADMIN',
          emisorId: req.usuarioAdmin.id,
          contenido:
            `La salida del ${salida.fecha} fue suspendida. ` +
            `Motivo: ${motivo}. ` +
            `Comunicate por este chat para coordinar ` +
            `reintegro o reprogramación.`
        },
        {
          transaction: t
        }
      );

      // Guardamos el ID de la reserva afectada.
      ids.push(d.id);

    }


    // --------------------------------------------
    // PASO 6: CONFIRMAR LOS CAMBIOS
    // --------------------------------------------

    await t.commit();


    // --------------------------------------------
    // PASO 7: ENVIAR LOS CORREOS
    // --------------------------------------------

    // Intentamos enviar un correo por reserva vigente.
    for (const d of vigentes) {
      await correoDetalle(d, motivo);
    }


    // --------------------------------------------
    // PASO 8: RESPONDER AL FRONTEND
    // --------------------------------------------

    res.json({
      estado: true,
      data: {
        reservasAvisadas: ids.length,
        idsDetalle: ids
      }
    });

  } catch (e) {

    // Si hay un error antes del commit,
    // revertimos los cambios de la transacción.
    if (!t.finished) {
      await t.rollback();
    }

    res.status(e.status || 500).json({
      estado: false,
      mensaje: e.message
    });

  }
}


// Historial administrativo: cancelaciones individuales y bajas completas.
// No modifica estados ni cupos. Incluye el ID del detalle para abrir su chat.
export async function historialCancelaciones(req, res) {
  try {
    const { Op } = await import('sequelize');
    const detalles = await DetalleCompra.findAll({
      include: [
        { model: Compra, as: 'compra', required: true,
          include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'apellido', 'email'] }] },
        { model: Excursion, as: 'excursion', attributes: ['id','nombre'] },
        { model: FechaExcursion, as: 'salida', required: false,
          attributes: ['id','fecha','horaSalida','estadoSalida','motivoSuspension'] },
        { model: SolicitudCancelacion, as: 'solicitudes', required: false,
          attributes: ['id','estado','motivo','resolucion','fechaSolicitud'] },
      ],
      // La cancelación masiva no cambia necesariamente el estado del detalle:
      // se distingue por salida.estadoSalida, sin perder la conversación.
      where: { [Op.or]: [
        { estado: 'CANCELADA' },
        { '$compra.estado$': 'CANCELADA' },
        { '$salida.estadoSalida$': 'CANCELADA' },
      ] },
      order: [['id', 'DESC']],
      limit: 300,
      subQuery: false,
    });
    res.json({estado:true,data:detalles});
  } catch(e) {
    console.error('Error al consultar historial:',e);
    res.status(500).json({estado:false,mensaje:'No se pudo consultar el historial de cancelaciones'});
  }
}
