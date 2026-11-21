import { enviarConfirmacionReserva, enviarReservaConfirmada } from '../services/email.service.js';
import { Op } from 'sequelize';
import ConfiguracionEmpresa from '../models/configuracionEmpresa.model.js';
import {
    Compra,
    DetalleCompra,
    Carrito,
    ItemCarrito,
    Excursion,
    FechaExcursion,
    Usuario,
} from '../models/index.js';

import sequelize from '../config/database.js';

// GET /compras
export const obtener = async (req, res) => {
    try {
        const data = await Compra.findAll({
            include: [{ model: DetalleCompra, as:'detalles', include:[{model: Excursion, as:'excursion'}, {model:FechaExcursion,as:'salida'}] }],
            where: {
                idUsuario: req.usuario.id,
            },
        });

        res.json({
            estado: true,
            data,
        });
    } catch (error) {
        console.error('Error al obtener compras:', error);

        res.status(500).json({
            estado: false,
            mensaje: 'Error al obtener compras',
            error: error.message,
        });
    }
};

// GET /compras/admin
export const obtenerTodas = async (req,res) => {try {
 const pagina=Math.max(1,Number.parseInt(req.query.pagina,10)||1),limite=Math.min(100,Math.max(1,Number.parseInt(req.query.limite,10)||10));
 const where={};if(['PENDIENTE','CONFIRMADA','CANCELADA'].includes(req.query.estado))where.estado=req.query.estado;
 const inicio=req.query.desde,fin=req.query.hasta;
 if(inicio||fin){where.fechaCompra={};if(inicio)where.fechaCompra[Op.gte]=new Date(`${inicio}T00:00:00`);if(fin)where.fechaCompra[Op.lt]=new Date(new Date(`${fin}T00:00:00`).getTime()+86400000);}
 const detalleWhere={};if(req.query.idExcursion)detalleWhere.idExcursion=Number(req.query.idExcursion);
 if(req.query.idFechaExcursion)detalleWhere.idFechaExcursion=Number(req.query.idFechaExcursion);
 const filtrarDetalle=Object.keys(detalleWhere).length>0;
 const {count,rows}=await Compra.findAndCountAll({where,include:[
 {model:Usuario,as:'usuario',attributes:['id','nombre','apellido','email','telefono']},
 {model:DetalleCompra,as:'detalles',required:filtrarDetalle,where:filtrarDetalle?detalleWhere:undefined,include:[{model:Excursion,as:'excursion',attributes:['id','nombre']},{model:FechaExcursion,as:'salida',attributes:['id','fecha','cupoMinimo','cupoMaximo','cupos','estadoSalida','motivoSuspension']}]}],
 distinct:true,order:[['fechaCompra','DESC']],limit:limite,offset:(pagina-1)*limite});
 res.json({estado:true,data:{items:rows,total:count,pagina,paginas:Math.ceil(count/limite),limite}});
 }catch(error){console.error('Error al listar reservas:',error);res.status(500).json({estado:false,mensaje:'Error al consultar reservas'});}};

export const gestionarContacto = async(req,res)=>{try{
 const compra=await Compra.findByPk(req.params.id);if(!compra)return res.status(404).json({estado:false,mensaje:'Reserva inexistente'});
 const estadoContacto=String(req.body.estadoContacto||'CONTACTADO').toUpperCase();
 if(!['PENDIENTE','CONTACTADO','ESPERANDO_COMPROBANTE'].includes(estadoContacto))return res.status(400).json({estado:false,mensaje:'Estado de contacto inválido'});
 await compra.update({estadoContacto,observacionesGestion:String(req.body.observacionesGestion||'').slice(0,3000),ultimoContacto:new Date()});
 res.json({estado:true,data:compra});
 }catch(e){res.status(500).json({estado:false,mensaje:e.message});}};

// GET /compras/:id
export const obtenerPorId = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);

        const data = await Compra.findOne({
            where: {
                id,
                idUsuario: req.usuario.id,
            },
        });

        if (!data) {
            return res.status(404).json({
                estado: false,
                mensaje: 'Compra no encontrada',
            });
        }

        res.json({
            estado: true,
            data,
        });
    } catch (error) {
        console.error('Error al obtener compra:', error);

        res.status(500).json({
            estado: false,
            mensaje: 'Error al obtener compra',
            error: error.message,
        });
    }
};

// POST /compras
export const crear = async (req, res) => {
    if (!/^\+?[0-9 ()-]{8,25}$/.test(String(req.usuario?.telefono||''))) return res.status(400).json({estado:false,mensaje:'Antes de reservar, completá un teléfono válido en Mi perfil para que podamos contactarte.'});
    if (req.body?.aceptaCondiciones !== true) return res.status(400).json({estado:false,mensaje:'Debés aceptar las condiciones de reserva para continuar.'});
    const transaction = await sequelize.transaction();

    try {
        // 1. Buscamos el carrito ACTIVO del usuario autenticado.
        const carrito = await Carrito.findOne({
            where: {
                idUsuario: req.usuario.id,
                estado: 'ACTIVO',
            },
            transaction,
        });

        if (!carrito) {
            await transaction.rollback();

            return res.status(404).json({
                estado: false,
                mensaje: 'No tenés un carrito activo',
            });
        }

        // 2. Buscamos los items del carrito.
        const items = await ItemCarrito.findAll({
            where: {
                idCarrito: carrito.id,
            },
            transaction,
        });

        if (items.length === 0) {
            await transaction.rollback();

            return res.status(400).json({
                estado: false,
                mensaje: 'El carrito está vacío',
            });
        }

        // 3. Obtenemos las excursiones y calculamos
        //    los precios desde la base de datos.
        let total = 0;
        const detalles = [];

        for (const item of items) {
            const excursion = await Excursion.findByPk(
                item.idExcursion,
                {
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                }
            );

            if (!excursion) {
                throw new Error(
                    `La excursión ${item.idExcursion} no existe`
                );
            }

            const precioUnitario = Number(excursion.precio);
            const cantidad = Number(item.cantidad);

            if (!Number.isInteger(cantidad) || cantidad <= 0) {
                throw new Error(
                    `La cantidad para la excursión ${excursion.id} no es válida`
                );
            }

            // Si existen salidas cargadas, cada reserva debe indicar una de ellas.
            const salidasConfiguradas = await FechaExcursion.count({ where: { idExcursion: excursion.id }, transaction });
            if (!item.idFechaExcursion) throw new Error(`Seleccioná una salida programada para ${excursion.nombre}`);
            const salida = item.idFechaExcursion ? await FechaExcursion.findOne({
                where: { id: item.idFechaExcursion, idExcursion: excursion.id },
                transaction, lock: transaction.LOCK.UPDATE,
            }) : null;
            if (!salida) throw new Error('La fecha elegida ya no existe');
            if (salida && salida.fecha < new Date().toISOString().slice(0,10)) throw new Error('La fecha elegida ya pasó');
            const disponibles = Number(salida.cupos);
            if (!Number.isFinite(disponibles) || disponibles < cantidad) throw new Error(`Cupos insuficientes para ${excursion.nombre}`);

            total += precioUnitario * cantidad;

            detalles.push({
                idExcursion: excursion.id,
                idFechaExcursion: salida?.id || null,
                cantidad,
                precioUnitario,
            });

            if (salida?.estadoSalida==='CANCELADA') throw new Error('Esta salida fue suspendida');
            await salida.update({ cupos: disponibles - cantidad }, { transaction });
        }

        // 4. Creamos la compra.
        const compra = await Compra.create(
            {
                idUsuario: req.usuario.id,
                total,
                estado: 'PENDIENTE',
                fechaCompra: new Date(),
                venceEn: new Date(Date.now()+24*60*60*1000),
                estadoContacto:'PENDIENTE',
            },
            { transaction }
        );

        // 5. Asociamos cada detalle a la compra.
        for (const detalle of detalles) {
            await DetalleCompra.create(
                {
                    idCompra: compra.id,
                    idExcursion: detalle.idExcursion,
                    idFechaExcursion: detalle.idFechaExcursion,
                    cantidad: detalle.cantidad,
                    precioUnitario: detalle.precioUnitario,
                    estado: "PENDIENTE",
                },
                { transaction }
            );
        }

        // 6. Marcamos el carrito como comprado.
        await carrito.update(
            {
                estado: 'COMPRADO',
            },
            { transaction }
        );

        // 7. Confirmamos toda la operación.
        await transaction.commit();

        // La compra ya fue confirmada: una falla de email NO revierte ni duplica el pedido.
        let correoEnviado = false;
        try {
            const usuario = await Usuario.findByPk(req.usuario.id);
            const empresa = await ConfiguracionEmpresa.findByPk(1);
            const detalleCorreo = await Promise.all(detalles.map(async d => {
                const e = await Excursion.findByPk(d.idExcursion);
                const f = d.idFechaExcursion ? await FechaExcursion.findByPk(d.idFechaExcursion) : null;
                return { nombre: e?.nombre, fecha: f?.fecha || e?.fecha, cantidad:d.cantidad, condiciones:e?.condicionesReserva };
            }));
            if(usuario?.email) correoEnviado = await enviarConfirmacionReserva({destinatario:usuario.email,nombre:usuario.nombre,compra,detalles:detalleCorreo,empresa});
        } catch (emailError) { console.error('Reserva creada, pero el correo falló:',emailError.message); }
        res.status(201).json({
            estado: true,
            mensaje: correoEnviado ? 'Reserva recibida. Te enviamos el detalle a tu correo (pago pendiente).' : 'Reserva recibida (pago pendiente). No pudimos confirmar el envío del correo.',
            correoEnviado,
            data: compra,
        });

    } catch (error) {
        if (!transaction.finished) await transaction.rollback();

        console.error('Error al crear compra:', error);

        res.status(400).json({
            estado: false,
            mensaje: 'No se pudo crear la compra',
            error: error.message,
        });
    }
};

// Transición de estados: compra + cupos en la MISMA transacción.
export const cambiarEstadoReserva = async(id,nuevoEstado,idAdmin=null) => {
 const t=await sequelize.transaction();let compra;
 try{
  compra=await Compra.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});
  if(!compra)throw Object.assign(new Error('Reserva no encontrada'),{status:404});
  if(compra.estado!=='PENDIENTE')throw Object.assign(new Error('La reserva ya fue procesada'),{status:409});
  if(!['CONFIRMADA','CANCELADA'].includes(nuevoEstado))throw Object.assign(new Error('Estado inválido'),{status:400});
  if(nuevoEstado==='CONFIRMADA'&&compra.venceEn&&new Date(compra.venceEn)<=new Date())throw Object.assign(new Error('Plazo de pago vencido; primero cancelá la reserva'),{status:409});
  // Se actualiza el estado de cada detalle junto con el de la compra.
  // El reporte de ocupación y la mensajería usan prioritariamente DetalleCompra.estado.
  const detalles = await DetalleCompra.findAll({
    where: { idCompra: id },
    transaction: t,
    lock: t.LOCK.UPDATE,
  });

  for (const detalle of detalles) {
    // Una reserva individual cancelada previamente no debe reactivarse
    // ni liberar sus cupos una segunda vez.
    if ((detalle.estado ?? compra.estado) !== 'PENDIENTE') continue;

    if (nuevoEstado === 'CANCELADA') {
      if (detalle.idFechaExcursion) {
        const salida = await FechaExcursion.findByPk(detalle.idFechaExcursion, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (salida && salida.estadoSalida !== 'CANCELADA') {
          const max = Number(salida.cupoMaximo ?? Number(salida.cupos) + Number(detalle.cantidad));
          await salida.update({
            cupos: Math.min(max, Number(salida.cupos) + Number(detalle.cantidad)),
          }, { transaction: t });
        }
      } else {
        const excursion = await Excursion.findByPk(detalle.idExcursion, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (excursion) {
          await excursion.update({
            cupos: Number(excursion.cupos) + Number(detalle.cantidad),
          }, { transaction: t });
        }
      }
    }

    await detalle.update({ estado: nuevoEstado }, { transaction: t });
  }
  await compra.update({estado:nuevoEstado,...(nuevoEstado==='CONFIRMADA'?{idAdminConfirmador:idAdmin,confirmadoEn:new Date()}:{})},{transaction:t});
  await t.commit();return compra;
 }catch(e){if(!t.finished)await t.rollback();throw e;}
};

export const actualizar = async(req,res)=>{try{
 const {estado}=req.body;
 const compra=await cambiarEstadoReserva(Number(req.params.id),estado,req.usuarioAdmin?.id);
 let correoEnviado=false;
 if(estado==='CONFIRMADA'){
  try{
   const cliente=await Usuario.findByPk(compra.idUsuario);
   const detalles=await DetalleCompra.findAll({where:{idCompra:compra.id},include:[{model:Excursion,as:'excursion'},{model:FechaExcursion,as:'salida'}]});
   const empresa=await ConfiguracionEmpresa.findByPk(1);
   correoEnviado=await enviarReservaConfirmada({destinatario:cliente?.email,nombre:cliente?.nombre,compra,empresa,detalles:detalles.map(d=>({nombre:d.excursion?.nombre,fecha:d.salida?.fecha||d.excursion?.fecha,cantidad:d.cantidad}))});
   if(correoEnviado)await compra.update({correoConfirmacionEnviado:true});
  }catch(emailError){console.error('Confirmación guardada, email fallido:',emailError.message);}
 }
 res.json({estado:true,mensaje:estado==='CONFIRMADA'?'Pago confirmado':'Reserva cancelada, cupos liberados',correoEnviado,data:compra});
 }catch(e){res.status(e.status||400).json({estado:false,mensaje:e.message});}};
