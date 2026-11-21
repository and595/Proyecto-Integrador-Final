// HACKATHON GRUPO 9 - MODELO MENSAJE
// Cada fila representa un mensaje dentro de una reserva (DetalleCompra).
// Sequelize define los tipos y genera consultas SQL; no es necesario escribir INSERT manualmente.
// emisorTipo distingue CLIENTE de ADMIN; emisorId señala la cuenta que escribió.

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// Un hilo de mensajes por cada detalle de compra (excursión reservada).
const Mensaje = sequelize.define('Mensaje', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  idDetalleCompra: { type: DataTypes.INTEGER, allowNull: false },
  emisorTipo: { type: DataTypes.ENUM('CLIENTE', 'ADMIN'), allowNull: false },
  emisorId: { type: DataTypes.INTEGER, allowNull: false },
  contenido: { type: DataTypes.TEXT, allowNull: false },
  fechaEnvio: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, { tableName: 'mensajes', timestamps: false });
export default Mensaje;
