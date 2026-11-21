// Solicitud separada de la cancelación efectiva: NO cambia la reserva al enviarla.
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
const SolicitudCancelacion = sequelize.define('SolicitudCancelacion', {
 id:{type:DataTypes.INTEGER,primaryKey:true,autoIncrement:true},
 idDetalleCompra:{type:DataTypes.INTEGER,allowNull:false},
 motivo:{type:DataTypes.TEXT,allowNull:false},
 estado:{type:DataTypes.ENUM('EN_EVALUACION','ACEPTADA','RECHAZADA','REPROGRAMADA'),allowNull:false,defaultValue:'EN_EVALUACION'},
 resolucion:{type:DataTypes.TEXT,allowNull:true},
 idAdminResolutor:{type:DataTypes.INTEGER,allowNull:true},
 fechaSolicitud:{type:DataTypes.DATE,allowNull:false,defaultValue:DataTypes.NOW},
 fechaResolucion:{type:DataTypes.DATE,allowNull:true}
},{tableName:'solicitudes_cancelacion',timestamps:false});
export default SolicitudCancelacion;
