import {Router} from 'express';
import ConfiguracionEmpresa from '../models/configuracionEmpresa.model.js';
import {verificarAdmin} from '../middleware/auth.js';
import {verificarPermiso} from '../middleware/permisos.js';
const router=Router();
router.get('/contacto',async(_req,res)=>{try{const d=await ConfiguracionEmpresa.findByPk(1);res.json({estado:true,data:d?{nombre:d.nombre,whatsapp:d.whatsapp,email:d.email}:null});}catch(e){res.status(500).json({estado:false,mensaje:'Error consultando empresa'});}});
router.put('/',verificarAdmin,verificarPermiso('empresa.editar'),async(req,res)=>{try{
 const nombre=String(req.body.nombre||'').trim(),whatsapp=String(req.body.whatsapp||'').trim(),email=String(req.body.email||'').trim();
 if(!nombre|| (email&&!/^\S+@\S+\.\S+$/.test(email)) || (whatsapp&&!/^\+?[0-9 ()-]{8,25}$/.test(whatsapp)))return res.status(400).json({estado:false,mensaje:'Datos de contacto inválidos'});
 const [d]=await ConfiguracionEmpresa.findOrCreate({where:{id:1},defaults:{nombre,whatsapp,email}});await d.update({nombre,whatsapp,email});res.json({estado:true,data:d});
 }catch(e){res.status(500).json({estado:false,mensaje:e.message});}});
export default router;
