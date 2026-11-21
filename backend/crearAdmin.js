import 'dotenv/config';
import sequelize from './src/config/database.js';
import UsuarioAdmin from './src/models/usuarioAdmin.model.js';
import Rol from './src/models/roles.model.js';

// Se ejecuta una sola vez por base: npm run seed:admin
// Si el admin ya existe, no duplica ni modifica su contraseña.
async function crearAdmin() {
  try {
    const email = (process.env.ADMIN_SEED_EMAIL || 'admin@descubrecordoba.local').trim().toLowerCase();
    const contrasenia = process.env.ADMIN_SEED_PASSWORD;
    if (!contrasenia || contrasenia.length < 12) {
      throw new Error('Definí ADMIN_SEED_PASSWORD (mínimo 12 caracteres) en el .env antes de ejecutar la semilla.');
    }
    await sequelize.authenticate();
    const [rol] = await Rol.findOrCreate({
      where: { nombre: 'ADMIN' },
      defaults: { descripcion: 'Administrador del sistema' },
    });
    const existente = await UsuarioAdmin.findOne({ where: { email } });
    if (existente) {
      console.log(`El administrador ${email} ya existe. No se cambió su contraseña.`);
      if (existente.idRol !== rol.id) {
        console.log('Su rol actual tampoco fue modificado. Revisalo en el panel o la BD.');
      }
      return;
    }
    await UsuarioAdmin.create({
      nombre: 'Administrador', apellido: 'Principal', email,
      contrasenia, // El hook beforeCreate del modelo aplica bcrypt.
      idRol: rol.id,
    });
    console.log(`Administrador creado: ${email} (rol ADMIN).`);
  } catch (error) {
    console.error('No se pudo preparar el administrador:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}
crearAdmin();
