// AuthContext.jsx
// Provee el estado global de autenticación para toda la aplicación.
// Guarda el usuario logueado y el token JWT en memoria y en localStorage.

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

import {
  loginUsuario,
  registrarUsuario,
  refreshTokenUsuario,
} from '../services/authService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Usuario actualmente autenticado.
  const [usuario, setUsuario] = useState(null);

  // JWT actual.
  const [token, setToken] = useState(null);

  // Mientras comprobamos si existe una sesión válida.
  const [cargando, setCargando] = useState(true);

  // ========================================================
  // LOGOUT
  // ========================================================

  const logout = useCallback(() => {
    // Eliminamos los datos de sesión del navegador.
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');

    // Limpiamos también los estados de React.
    setToken(null);
    setUsuario(null);
  }, []);

  // ========================================================
  // VALIDAR TOKEN / REFRESH
  // ========================================================
  //
  // Cuando la app se abre o se refresca:
  // 1. Buscamos si hay token guardado.
  // 2. Si existe, lo validamos contra el backend.
  // 3. El backend devuelve un token renovado + usuario.
  //
  // GET /auth/usuario/refresh
  //
  const validarToken = useCallback(async () => {
    const tokenGuardado =
      localStorage.getItem('token');

    // Si no existe token, no hay sesión iniciada.
    if (!tokenGuardado) {
      setCargando(false);
      return false;
    }

    try {
      // authService llama al backend.
      const respuesta =
        await refreshTokenUsuario();

      // El backend devuelve:
      //
      // {
      //   estado: true,
      //   mensaje: "...",
      //   token: "...",
      //   usuario: {...}
      // }

      const nuevoToken =
        respuesta.token;

      const usuarioActualizado =
        respuesta.usuario;

      // Guardamos el JWT renovado.
      localStorage.setItem(
        'token',
        nuevoToken
      );

      // Guardamos el usuario actualizado.
      localStorage.setItem(
        'usuario',
        JSON.stringify(usuarioActualizado)
      );

      // Actualizamos React.
      setToken(nuevoToken);
      setUsuario(usuarioActualizado);

      return true;

    } catch (error) {
      console.warn(
        'El token guardado no es válido o expiró:',
        error.message
      );

      // Si el backend rechaza el token,
      // cerramos automáticamente la sesión.
      logout();

      return false;

    } finally {
      setCargando(false);
    }
  }, [logout]);

  // ========================================================
  // AL CARGAR LA APLICACIÓN
  // ========================================================
  //
  // Se ejecuta una vez al iniciar la app.
  // También ocurre cuando refrescamos con F5.
  useEffect(() => {
    validarToken();
  }, [validarToken]);

  // ========================================================
  // LOGIN
  // ========================================================
  //
  // Recibe email + contrasenia desde Login.jsx.
  //
  // POST /auth/usuario/login
  //
  const login = async (
    email,
    contrasenia
  ) => {
    const respuesta =
      await loginUsuario(
        email,
        contrasenia
      );

    // El backend devuelve:
    //
    // {
    //   token: "...",
    //   usuario: {...}
    // }

    const nuevoToken =
      respuesta.token;

    const nuevoUsuario =
      respuesta.usuario;

    // Guardamos sesión en localStorage.
    localStorage.setItem(
      'token',
      nuevoToken
    );

    localStorage.setItem(
      'usuario',
      JSON.stringify(nuevoUsuario)
    );

    // Actualizamos estados.
    setToken(nuevoToken);
    setUsuario(nuevoUsuario);

    return nuevoUsuario;
  };

  // ========================================================
  // REGISTRO
  // ========================================================
  //
  // Recibe los datos desde Registro.jsx.
  //
  // POST /auth/usuario/registro
  //
  // Como el backend devuelve token + usuario,
  // queda logueado automáticamente.
  //
  const registro = async (datos) => {
    const respuesta =
      await registrarUsuario(datos);

    const nuevoToken =
      respuesta.token;

    const nuevoUsuario =
      respuesta.usuario;

    localStorage.setItem(
      'token',
      nuevoToken
    );

    localStorage.setItem(
      'usuario',
      JSON.stringify(nuevoUsuario)
    );

    setToken(nuevoToken);
    setUsuario(nuevoUsuario);

    return nuevoUsuario;
  };

  // ========================================================
  // ACTUALIZAR USUARIO
  // ========================================================
  //
  // Se usa después de modificar el perfil
  // para actualizar el usuario global.
  //
  const actualizarUsuario = (
    datosActualizados
  ) => {
    const usuarioNuevo = {
      ...usuario,
      ...datosActualizados,
    };

    localStorage.setItem(
      'usuario',
      JSON.stringify(usuarioNuevo)
    );

    setUsuario(usuarioNuevo);
  };

  // ========================================================
  // VALORES DISPONIBLES EN TODA LA APP
  // ========================================================

  const value = {
    usuario,
    token,

    // true si existe usuario autenticado.
    isAuthenticated: !!usuario,

    cargando,

    login,
    registro,
    logout,
    validarToken,
    actualizarUsuario,
  };

  return (
    <AuthContext.Provider value={value}>
      {cargando ? (
        <div className="flex min-h-screen items-center justify-center bg-black text-white">
          <p className="text-sm">
            Verificando sesión...
          </p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

// ==========================================================
// HOOK PERSONALIZADO
// ==========================================================

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth debe utilizarse dentro de AuthProvider'
    );
  }

  return context;
}