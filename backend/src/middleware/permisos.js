// Permisos por rol definidos en código (no hay tablas de permisos).
export const matrizPermisos = Object.freeze({
 ADMIN:['administradores.leer','administradores.escribir','excursiones.escribir','reservas.leer','reservas.escribir','empresa.editar'],
 OPERADOR:['administradores.leer','excursiones.escribir','reservas.leer'],
 'GESTOR DE RESERVAS':['reservas.leer','reservas.escribir'],
});
export const tienePermiso = (admin, permiso) =>
 Boolean(matrizPermisos[String(admin?.rol?.nombre||'').toUpperCase()]?.includes(permiso));
export const verificarPermiso = (permiso) => (req,res,next) => {
 if(!tienePermiso(req.usuarioAdmin,permiso)) return res.status(403).json({estado:false,mensaje:'No tenés permiso para esta operación'});
 next();
};
