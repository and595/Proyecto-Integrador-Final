import api from './api.js';
export const listarExcursionesPublicas = async () => {
 const respuesta = await api.get('/excursiones', { params: { page: 1, limit: 100 } });
 return respuesta.data?.data || [];
};
export const buscarExcursiones = async (q = '', page = 1, limit = 6) => {
 const respuesta = await api.get('/excursiones', { params: { q, page, limit } });
 return { excursiones: respuesta.data?.data || [], paginacion: respuesta.data?.paginacion };
};

export const listarFechasPublicas = async (id) => (await api.get(`/excursiones/${id}/fechas`)).data?.data || [];
