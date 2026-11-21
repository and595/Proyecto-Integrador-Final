// HACKATHON GRUPO 9 - CONTROLADOR DE MENSAJES
// validarAcceso comprueba que el cliente sea dueño de la reserva antes de leer o escribir.
// listarMensajes recupera la conversación ordenada por fecha.
// enviarMensaje valida el texto y guarda un nuevo registro en MySQL.

import { DetalleCompra, Compra, Mensaje, Usuario, UsuarioAdmin } from '../models/index.js';
import {enviarAvisoMensaje} from '../services/email.service.js';

// Misma lógica para cliente y admin, pero comprobando acceso al detalle.
async function validarAcceso(req, res) {
  const detalle = await DetalleCompra.findByPk(req.params.idDetalle, {
    include: [{ model: Compra, as: 'compra' }]
  });
  if (!detalle) { res.status(404).json({ mensaje: 'Reserva no encontrada' }); return null; }
  if (req.usuario && Number(detalle.compra.idUsuario) !== Number(req.usuario.id)) {
    res.status(403).json({ mensaje: 'No podés acceder a esta conversación' }); return null;
  }
  // El administrador ya fue autenticado por verificarAdmin.
  return detalle;
}

export const listarMensajes = async (req, res) => {
  try {
    if (!await validarAcceso(req, res)) return;
    const mensajes = await Mensaje.findAll({
      where: { idDetalleCompra: req.params.idDetalle },
      order: [['fechaEnvio', 'ASC'], ['id', 'ASC']]
    });
    res.json({ mensajes });
  } catch (error) { console.error(error); res.status(500).json({ mensaje: 'Error al consultar mensajes' }); }
};

export const enviarMensaje = async (req, res) => {
  try {
    if (!await validarAcceso(req, res)) return;
    const contenido = typeof req.body.contenido === 'string' ? req.body.contenido.trim() : '';
    if (!contenido || contenido.length > 2000) return res.status(400).json({ mensaje: 'Escribí entre 1 y 2000 caracteres' });
    const esAdmin = Boolean(req.usuarioAdmin);
    const mensaje = await Mensaje.create({
      idDetalleCompra: Number(req.params.idDetalle),
      emisorTipo: esAdmin ? 'ADMIN' : 'CLIENTE',
      emisorId: esAdmin ? req.usuarioAdmin.id : req.usuario.id,
      contenido
    });
    // Notificación opcional; nunca interrumpe el guardado del chat.
    try {const detalle=await DetalleCompra.findByPk(req.params.idDetalle);const compra=await Compra.findByPk(detalle.idCompra);if(esAdmin){const u=await Usuario.findByPk(compra.idUsuario);if(u?.email)await enviarAvisoMensaje({destinatario:u.email,idDetalle:detalle.id});}else if(process.env.ADMIN_NOTIFICATION_EMAIL)await enviarAvisoMensaje({destinatario:process.env.ADMIN_NOTIFICATION_EMAIL,idDetalle:detalle.id});}catch(e){console.error('Aviso correo:',e.message)}
    res.status(201).json({ mensaje });
  } catch (error) { console.error(error); res.status(500).json({ mensaje: 'Error al enviar el mensaje' }); }
};
