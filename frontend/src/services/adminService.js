// adminService.js centraliza las llamadas al backend del panel de administración.
//
// Cada función exportada representa una operación contra la API.
// Usa adminApi, que automáticamente inyecta el token de admin en cada request.
// Esto mantiene la sesión de admin aislada de la sesión de cliente.

import { adminApi } from './adminApi.js';

// POST /auth/admin/login -> Inicia sesión como administrador.
// Recibe email y password del formulario y devuelve token + datos del usuario.
export const loginAdmin = async (email, password) => {
    return adminApi.post('/auth/admin/login', {
        email,
        contrasenia: password,
    });
};

// GET /auth/admin/refresh -> Valida el token actual y devuelve uno renovado.
// Se usa al recargar la página para mantener la sesión activa.
export const refreshTokenAdmin = async () => {
    return adminApi.get('/auth/admin/refresh');
};

// GET /auth/admin/perfil -> Obtiene el perfil del administrador logueado.
export const obtenerPerfilAdmin = async () => {
    return adminApi.get('/auth/admin/perfil');
};

// CRUD de administradores bajo /usuarioAdmin.
// Los endpoints POST, PUT y DELETE están protegidos en el backend para rol ADMIN.
export const listarAdministradores = async () => adminApi.get('/usuarioAdmin');
export const obtenerAdministradorPorId = async (id) => adminApi.get(`/usuarioAdmin/${id}`);
export const crearAdministrador = async (datos) => adminApi.post('/usuarioAdmin', datos);
export const actualizarAdministrador = async (id, datos) => adminApi.put(`/usuarioAdmin/${id}`, datos);
export const eliminarAdministrador = async (id) => adminApi.delete(`/usuarioAdmin/${id}`);
export const listarRolesAdmin = async () => adminApi.get('/usuarioAdmin/roles');

// CRUD de excursiones bajo /excursiones.
// GET es público, pero desde el panel admin usamos adminApi para mantener
// una única configuración de conexión con el backend.
// POST, PUT y DELETE requieren token de administrador.

export const listarExcursiones = async () => 
    adminApi.get('/excursiones/admin/listado?limit=100');

export const obtenerExcursionPorId = async (id) => 
    adminApi.get(`/excursiones/${id}`);

export const crearExcursion = async (datos) => 
    adminApi.post('/excursiones', datos);

export const actualizarExcursion = async (id, datos) => 
    adminApi.put(`/excursiones/${id}`, datos);

export const eliminarExcursion = async (id) => 
    adminApi.delete(`/excursiones/${id}`);

// CRUD de categorías bajo /categorias.
export const listarCategorias = async () =>
    adminApi.get('/categorias');

export const crearCategoria = async (datos) =>
    adminApi.post('/categorias', datos);

export const actualizarCategoria = async (id, datos) =>
    adminApi.put(`/categorias/${id}`, datos);

export const eliminarCategoria = async (id) =>
    adminApi.delete(`/categorias/${id}`);

// Compras: consulta administrativa y actualización de estado.
export const listarComprasAdmin = async (filtros = {}) => adminApi.get('/compras/admin',{params:filtros});
export const obtenerEmpresa = async () => adminApi.get('/empresa/contacto');
export const guardarEmpresa = async (datos) => adminApi.put('/empresa',datos);

export const actualizarEstadoCompraAdmin = async (id, estado) =>
    adminApi.put(`/compras/${id}`, { estado });
export const listarFechasExcursion = async (id) => adminApi.get(`/excursiones/${id}/fechas`);
export const crearFechaExcursion = async (id, datos) => adminApi.post(`/excursiones/${id}/fechas`, datos);
export const quitarFechaExcursion = async (id, fechaId) => adminApi.delete(`/excursiones/${id}/fechas/${fechaId}`);

export const editarFechaExcursion = async (id,fechaId,datos) => adminApi.put(`/excursiones/${id}/fechas/${fechaId}`,datos);