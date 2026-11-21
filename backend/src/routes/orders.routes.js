import { Router } from 'express';
import { verificarUsuario } from '../middleware/auth.js';
import { crear, obtener } from '../controllers/compra.controller.js';
const router = Router();
router.post('/', verificarUsuario, crear);
router.get('/my-orders', verificarUsuario, obtener);
export default router;
