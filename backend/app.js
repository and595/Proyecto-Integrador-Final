
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import routes from './src/routes/index.js';
import sequelize from './src/config/database.js';
import 'dotenv/config';
import { iniciarVencimientos } from './src/services/vencimientos.service.js';

// verificamos que esten cargados los tokens de cliente y administrador
if (!process.env.JWT_SECRET_ADMIN) {
    throw new Error('Falta configurar JWT_SECRET_ADMIN en el archivo .env');
}

if (!process.env.JWT_SECRET_CLIENT) {
    throw new Error('Falta configurar JWT_SECRET_CLIENT en el archivo .env');
}

// Creamos la aplicación Express.
const app = express();

// cors() permite que el frontend (que corre en otro puerto) se comunique con el backend.
// Leemos los orígenes permitidos desde la variable CORS_ORIGINS del .env.
// Los orígenes pueden estar separados por comas, por ejemplo:
// CORS_ORIGINS=http://localhost:5173/,http://localhost:5174/
/*   const allowedOrigins = (process.env.CORS_ORIGINS || '*')
    .split(',')
    .map(origin => origin.trim().replace(/\/$/, '')) // quitamos espacios y la barra final
    .filter(Boolean);   */

// Versión simple con un vector (array) de orígenes permitidos.
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
];

const corsOptions = {
    // origin es una función que decide si deja pasar la petición.
    origin: (origin, callback) => {
        // Las peticiones sin origin (como curl o apps móviles) se permiten.
        if (!origin) return callback(null, true);

        // Si el vector contiene '*', permitimos todos los orígenes.
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.warn(`Origen no permitido por CORS: ${origin}`);
        return callback(new Error('No permitido por CORS'));
    },
    credentials: true,
};

app.use(cors(corsOptions));

// express.json() permite leer el cuerpo de las peticiones en formato JSON.
app.use(express.json());
// Solo servimos archivos subidos; no exponemos archivos de configuración.
app.use('/uploads', express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), 'uploads')));

// Asociamos todas las rutas al path raíz '/'.
// Las rutas internas definirán sus propios sub-paths, por ejemplo /productos, /usuarios.

app.use('/', routes);

// El puerto se lee de una variable de entorno o, si no existe, usamos 3000.
const PUERTO = process.env.PORT || 3000;

// Función que inicia el servidor una vez verificada la conexión con la base de datos.
const iniciarServidor = async () => {
    try {
        // sequelize.authenticate() solo verifica que se puede conectar a la base de datos.
        // No realiza migraciones ni modifica tablas.
        // await sequelize.sync( { force: true } );
        
      await sequelize.authenticate();
console.log('Conexión a la base de datos establecida correctamente.');

// Migraciones manuales: no alterar tablas automáticamente en un servidor compartido.
// await sequelize.sync();
console.log('Modelos cargados. Asegurate de aplicar MIGRACION_MEJORAS_2026.sql antes de iniciar esta versión.');

app.listen(PUERTO, () => {
    iniciarVencimientos();
    console.log('Servidor iniciado correctamente en el puerto:', PUERTO);
});
    } catch (error) {
        console.error('No se pudo conectar a la base de datos:', error);
    }
};

iniciarServidor();
