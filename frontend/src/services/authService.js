// authService.js
// Maneja las peticiones de autenticación al backend.

import api from './api.js';


// LOGIN
export const loginUsuario = async (
  email,
  contrasenia
) => {
  const respuesta = await api.post(
    '/auth/usuario/login',
    {
      email,
      contrasenia,
    }
  );

  return respuesta.data;
};


// REGISTRO
export const registrarUsuario = async (datos) => {
  const respuesta = await api.post(
    '/auth/usuario/registro',
    datos
  );

  return respuesta.data;
};


// REFRESH TOKEN
export const refreshTokenUsuario = async () => {
  const respuesta = await api.get(
    '/auth/usuario/refresh'
  );

  return respuesta.data;
};


// OBTENER PERFIL
export const obtenerPerfilUsuario = async () => {
  const respuesta = await api.get(
    '/auth/usuario/perfil'
  );

  return respuesta.data;
};


// ACTUALIZAR PERFIL
export const actualizarPerfilUsuario = async (
  datos
) => {
  const respuesta = await api.put(
    '/auth/usuario/perfil',
    datos
  );

  return respuesta.data;
};
export const cambiarContraseniaUsuario = async (datos) => (await api.put('/auth/usuario/cambiar-contrasenia', datos)).data;
