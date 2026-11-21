import api from './api.js';
import { listarExcursionesPublicas } from './excursionesService.js';

export async function obtenerOCrearCarritoActivo() {
    const respuesta = await api.get('/carrito');
    const carritos = respuesta.data?.data || [];
    const carritoActivo = carritos.find((carrito) => carrito.estado === 'ACTIVO');

    if (carritoActivo) {
        return carritoActivo;
    }

    const creado = await api.post('/carrito', {});
    return creado.data.data;
}

export async function agregarAlCarrito(idExcursion, cantidad, idFechaExcursion = null) {
    const carrito = await obtenerOCrearCarritoActivo();

    const respuesta = await api.post('/itemCarrito', {
        idCarrito: carrito.id,
        idExcursion,
        idFechaExcursion,
        cantidad,
    });

    return respuesta.data.data;
}

export async function obtenerResumenCarrito() {
    const respuestaCarritos = await api.get('/carrito');
    const carrito = (respuestaCarritos.data?.data || [])
        .find((item) => item.estado === 'ACTIVO');

    if (!carrito) {
        return { carrito: null, items: [] };
    }

    const [respuestaItems, excursiones] = await Promise.all([
        api.get('/itemCarrito'),
        listarExcursionesPublicas(),
    ]);

    const excursionesPorId = new Map(
        excursiones.map((excursion) => [excursion.id, excursion])
    );

    const items = (respuestaItems.data?.data || [])
        .filter((item) => item.carrito?.id === carrito.id)
        .map((item) => ({
            ...item,
            excursion: excursionesPorId.get(item.idExcursion),
        }));

    const salidas = await Promise.all([...new Set(items.filter(i=>i.idFechaExcursion).map(i=>i.idExcursion))].map(async id => {
      try { return [id, (await api.get(`/excursiones/${id}/fechas`)).data?.data || []]; } catch { return [id, []]; }
    }));
    const porExcursion = new Map(salidas);
    return { carrito, items: items.map(i=>({...i, salida: (porExcursion.get(i.idExcursion)||[]).find(s=>s.id===i.idFechaExcursion)})) };
}

export async function actualizarCantidadItem(idItem, cantidad) {
    const respuesta = await api.put(`/itemCarrito/${idItem}`, { cantidad });
    return respuesta.data.data;
}

export async function eliminarItemCarrito(idItem) {
    await api.delete(`/itemCarrito/${idItem}`);
}

export async function confirmarCompra() {
    const respuesta = await api.post('/compras', {});
    return respuesta.data.data;
}
