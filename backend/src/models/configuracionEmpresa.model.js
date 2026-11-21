import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
const ConfiguracionEmpresa = sequelize.define('ConfiguracionEmpresa', {
 id: {type:DataTypes.INTEGER, primaryKey:true, autoIncrement:true},
 nombre: {type:DataTypes.STRING, allowNull:false, defaultValue:'Descubre Córdoba'},
 whatsapp: {type:DataTypes.STRING, allowNull:false, defaultValue:''},
 email: {type:DataTypes.STRING, allowNull:false, defaultValue:''},
}, {tableName:'configuracion_empresa',timestamps:false});
export default ConfiguracionEmpresa;
