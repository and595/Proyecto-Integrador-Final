// usuariosRoutes.js define las rutas relacionadas con usuarios.
// Cada ruta asocia un método HTTP con una función del controller.

import { Router } from 'express';
const router = Router();


import {
    obtener,
    obtenerPorId,
    crear,
    actualizar,
    eliminar,
} from '../controllers/usuario.controller.js';

import { verificarAdmin } from '../middleware/auth.js';
import { verificarPermiso } from '../middleware/permisos.js';

// GET /usuarios -> listar todos los usuarios.
// Solo administradores.
router.get('/', verificarAdmin, verificarPermiso('administradores.escribir'), obtener);

// GET /usuarios/:id -> ver un usuario específico.
// Solo administradores.
router.get('/:id', verificarAdmin, verificarPermiso('administradores.escribir'), obtenerPorId);

// POST /usuarios -> crear un nuevo usuario.
// Solo administradores.
router.post('/', verificarAdmin, verificarPermiso('administradores.escribir'), crear);

// PUT /usuarios/:id -> actualizar un usuario existente.
// Solo administradores.
router.put('/:id', verificarAdmin, verificarPermiso('administradores.escribir'), actualizar);

// DELETE /usuarios/:id -> eliminar un usuario.
// Solo administradores.
router.delete('/:id', verificarAdmin, verificarPermiso('administradores.escribir'), eliminar);

export default router;
