// HACKATHON GRUPO 9 - RUTAS DEL CHAT
// GET consulta mensajes y POST envía uno nuevo.
// Los middlewares verifican que el usuario haya iniciado sesión y los permisos de administración.
// La validación de propiedad de la reserva se realiza además en el controlador.

import { Router } from 'express';
import { verificarUsuario, verificarAdmin } from '../middleware/auth.js';
import { verificarPermiso } from '../middleware/permisos.js';
import { listarMensajes, enviarMensaje } from '../controllers/mensaje.controller.js';
const router = Router();
// Los clientes solo ven conversaciones de reservas propias.
router.get('/cliente/:idDetalle', verificarUsuario, listarMensajes);
router.post('/cliente/:idDetalle', verificarUsuario, enviarMensaje);
// Administradores con permiso de gestión de reservas.
router.get('/admin/:idDetalle', verificarAdmin, verificarPermiso('reservas.leer'), listarMensajes);
router.post('/admin/:idDetalle', verificarAdmin, verificarPermiso('reservas.escribir'), enviarMensaje);
export default router;
