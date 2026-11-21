import api from './api.js';

export async function listarFavoritos() {
    const respuesta = await api.get('/favorito');
    return respuesta.data?.data || [];
}

export async function agregarFavorito(idExcursion) {
    const respuesta = await api.post('/favorito', { idExcursion });
    return respuesta.data.data;
}

export async function quitarFavorito(idExcursion) {
    await api.delete(`/favorito/${idExcursion}`);
}