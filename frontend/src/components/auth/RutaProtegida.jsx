// RutaProtegida.jsx
// Protege páginas que requieren un usuario autenticado.

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

function RutaProtegida({ children }) {
  const location = useLocation();
  const {
    isAuthenticated,
    cargando,
  } = useAuth();

  // Mientras AuthContext valida el token,
  // mostramos un mensaje de carga.
  if (cargando) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm font-medium text-neutral-500">
          Cargando...
        </p>
      </div>
    );
  }

  // Si no está autenticado,
  // lo mandamos al Login.
  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?volver=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  // Si está autenticado,
  // mostramos la página protegida.
  return children;
}

export default RutaProtegida;