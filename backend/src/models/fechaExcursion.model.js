import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
const FechaExcursion = sequelize.define('FechaExcursion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  idExcursion: { type: DataTypes.INTEGER, allowNull: false },
  fecha: { type: DataTypes.DATEONLY, allowNull: false },
  // Hora propia de cada salida. NULL permite conservar las salidas anteriores.
  horaSalida: { type: DataTypes.TIME, allowNull: true },
  cupoMinimo: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1 } },
  cupoMaximo: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1 } },
  estadoSalida: { type: DataTypes.ENUM("PROGRAMADA","CANCELADA"), defaultValue:"PROGRAMADA" },
  motivoSuspension: { type: DataTypes.TEXT, allowNull:true },
  cupos: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0 } },
}, { tableName: 'fechas_excursiones', timestamps: false });
export default FechaExcursion;
