import {Op} from 'sequelize';
import {Compra} from '../models/index.js';
import {cambiarEstadoReserva} from '../controllers/compra.controller.js';
export async function procesarReservasVencidas(){
 const vencidas=await Compra.findAll({where:{estado:'PENDIENTE',venceEn:{[Op.lte]:new Date()}},attributes:['id'],limit:100,order:[['venceEn','ASC']]});
 for(const r of vencidas){try{await cambiarEstadoReserva(r.id,'CANCELADA');}catch(e){if(e.status!==409)console.error('Error al vencer reserva',r.id,e.message);}}
}
export function iniciarVencimientos(){
 const ejecutar=()=>procesarReservasVencidas().catch(e=>console.error('Vencimientos:',e.message));
 ejecutar();const timer=setInterval(ejecutar,60_000);timer.unref?.();
}
