import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { verificarAdmin } from '../middleware/auth.js';
import { verificarPermiso } from '../middleware/permisos.js';
import {
    obtener,
    obtenerAdmin,
    obtenerPorId,
    crear,
    actualizar,
    eliminar,
} from '../controllers/excursiones.controller.js';

import { listar as listarFechas, guardar as guardarFecha, editarFecha, eliminarFecha } from '../controllers/fechasExcursion.controller.js';
const router = Router();
const directorio = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');
fs.mkdirSync(directorio, { recursive: true });
const upload = multer({
 storage: multer.diskStorage({ destination: (_req, _file, cb) => cb(null, directorio),
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`) }),
 limits: { fileSize: 5 * 1024 * 1024, files: 10 },
 fileFilter: (_req, file, cb) => cb(null, ['image/jpeg','image/png','image/webp'].includes(file.mimetype)),
});
router.post('/upload', verificarAdmin, verificarPermiso('excursiones.escribir'), (req,res) => {
 upload.fields([{ name: 'imagenes', maxCount: 10 }, { name: 'imagen', maxCount: 1 }])(req,res,(error) => {
  if(error) return res.status(400).json({estado:false,mensaje:error.message});
  const archivos = [...(req.files?.imagenes || []), ...(req.files?.imagen || [])];
  if(!archivos.length) return res.status(400).json({estado:false,mensaje:'Elegí al menos una imagen JPG, PNG o WebP (máximo 5 MB cada una)'});
  const imagenes = archivos.map((archivo) => `/uploads/${archivo.filename}`);
  res.status(201).json({estado:true,data:{url:imagenes[0],imagenes}});
 });
});

// Rutas públicas
router.get('/admin/listado', verificarAdmin, verificarPermiso('reservas.leer'), obtenerAdmin);
router.get('/', obtener);
router.get('/:id', obtenerPorId);
router.get('/:id/fechas', listarFechas);
router.post('/:id/fechas', verificarAdmin, verificarPermiso('excursiones.escribir'), guardarFecha);
router.put('/:id/fechas/:fechaId', verificarAdmin, verificarPermiso('excursiones.escribir'), editarFecha);
router.delete('/:id/fechas/:fechaId', verificarAdmin, verificarPermiso('excursiones.escribir'), eliminarFecha);

// Rutas protegidas (solo administradores)
router.post('/', verificarAdmin, verificarPermiso('excursiones.escribir'), crear);
router.put('/:id', verificarAdmin, verificarPermiso('excursiones.escribir'), actualizar);
router.delete('/:id', verificarAdmin, verificarPermiso('excursiones.escribir'), eliminar);

export default router;