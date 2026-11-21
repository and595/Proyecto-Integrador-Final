import api from './api.js';
export const crearOrden = async () => (await api.post('/api/orders', { aceptaCondiciones: true })).data;
export const misOrdenes = async () => (await api.get('/api/orders/my-orders')).data.data || [];
