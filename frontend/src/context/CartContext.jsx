import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { obtenerResumenCarrito, agregarAlCarrito, actualizarCantidadItem, eliminarItemCarrito } from '../services/carritoService.js';
const CartContext = createContext(null);
const KEY = 'dc_cart_snapshot';
export function CartProvider({ children }) {
 const [items, setItems] = useState(() => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } });
 const guardar = useCallback((data) => { setItems(data); localStorage.setItem(KEY, JSON.stringify(data)); }, []);
 const refrescar = useCallback(async () => { const resumen = await obtenerResumenCarrito(); guardar(resumen.items); return resumen.items; }, [guardar]);
 const agregar = useCallback(async (id, cantidad) => { await agregarAlCarrito(id, cantidad); return refrescar(); }, [refrescar]);
 const actualizar = useCallback(async (id, cantidad) => { await actualizarCantidadItem(id, cantidad); return refrescar(); }, [refrescar]);
 const quitar = useCallback(async (id) => { await eliminarItemCarrito(id); return refrescar(); }, [refrescar]);
 const limpiar = useCallback(() => guardar([]), [guardar]);
 const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.excursion?.precio || 0) * Number(item.cantidad || 0), 0), [items]);
 return <CartContext.Provider value={{ items, refrescar, agregar, actualizar, quitar, limpiar, total }}>{children}</CartContext.Provider>;
}
export const useCart = () => { const context = useContext(CartContext); if (!context) throw new Error('CartProvider requerido'); return context; };
