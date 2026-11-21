import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DetalleCompra = sequelize.define('DetalleCompra', {
    
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,      
        autoIncrement: true,  
    },
    // Estado independiente por excursión; evita cancelar toda la compra.
    estado: { type: DataTypes.ENUM("PENDIENTE","CONFIRMADA","CANCELADA","REPROGRAMADA"), allowNull:true },
    cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false,      
    },
    precioUnitario: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,              
    },
    idCompra: {
        type: DataTypes.INTEGER, 
        allowNull: false
      },
    idFechaExcursion: { type: DataTypes.INTEGER, allowNull: true },
    idExcursion: {
        type: DataTypes.INTEGER, 
        allowNull: false
      }
},{ 
    tableName: 'detalleCompra',   
    timestamps: false,         // No agregamos columnas createdAt ni updatedAt.
});

export default DetalleCompra;