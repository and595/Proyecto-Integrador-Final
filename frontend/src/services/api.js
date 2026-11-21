// api.js
// Configuración general de Axios para comunicarnos
// con el backend de Descubre Córdoba.

import axios from 'axios';


// Creamos una instancia de Axios.
// Todas las peticiones van a partir de:
//
// http://localhost:3000
const api = axios.create({
  baseURL: 'http://localhost:3000',

  headers: {
    'Content-Type': 'application/json',
  },
});


// ==========================================================
// INTERCEPTOR
// ==========================================================
//
// Antes de enviar cualquier petición al backend,
// revisamos si existe un JWT guardado en localStorage.
//
// Si existe, Axios lo agrega automáticamente así:
//
// Authorization: Bearer TOKEN
//
// Esto nos sirve para:
//
// GET /auth/usuario/perfil
// GET /auth/usuario/refresh
// PUT /auth/usuario/perfil
//
api.interceptors.request.use(
  (config) => {

    // Buscamos el token guardado después del login.
    const token =
      localStorage.getItem('token');


    // Si existe, lo agregamos al header.
    if (token) {

      config.headers.Authorization =
        `Bearer ${token}`;
    }


    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);


export default api;