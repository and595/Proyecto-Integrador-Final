// App.jsx
//
// Componente principal de la aplicación.
//
// La aplicación se divide en dos zonas:
//
// 1. Sitio público:
//    - Utiliza AuthProvider para la autenticación de clientes.
//    - Muestra Header y Footer.
//    - Contiene las páginas públicas y las rutas protegidas del cliente.
//
// 2. Panel de administración:
//    - Utiliza AdminAuthProvider, independiente de la sesión del cliente.
//    - Utiliza AdminRoutes para sus propias rutas.
//    - No muestra Header ni Footer del sitio público.
//
// De esta manera, la autenticación de clientes y administradores
// permanecen completamente separadas.

import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { AdminAuthProvider } from './context/AdminAuthContext.jsx';

import RutaProtegida from './components/auth/RutaProtegida.jsx';

import Header from './components/layout/Header.jsx';
import Footer from './components/layout/Footer.jsx';

import Inicio from './pages/Inicio.jsx';
import Login from './pages/Login.jsx';
import Registro from './pages/Registro.jsx';
import Perfil from './pages/Perfil.jsx';
import Excursiones from './pages/Excursiones.jsx';
import ExcursionDetalle from './pages/ExcursionDetalle.jsx';
import Favoritos from './pages/Favoritos.jsx';
import Carrito from './pages/Carrito.jsx';
import MisPedidos from './pages/MisPedidos.jsx';
import Checkout from './pages/Checkout.jsx';

import AdminRoutes from './pages/admin/AdminRoutes.jsx';

import './App.css';


function App() {
    return (
        <AuthProvider>
            <CartProvider>
            <BrowserRouter>

                <Routes>

                    {/* ==========================================
                        PANEL DE ADMINISTRACIÓN
                        ==========================================

                        Todas las rutas que comienzan con /admin
                        utilizan el sistema de autenticación
                        independiente de los clientes.

                        AdminRoutes se encarga de:
                        - /admin/login
                        - /admin
                        - /admin/usuarios
                    */}

                    <Route
                        path="/admin/*"
                        element={
                            <AdminAuthProvider>
                                <AdminRoutes />
                            </AdminAuthProvider>
                        }
                    />


                    {/* ==========================================
                        SITIO PÚBLICO
                        ========================================== */}

                    <Route
                        path="/*"
                        element={
                            <div className="flex min-h-screen flex-col bg-slate-50 text-slate-700">

                                <Header />

                                <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">

                                    <Routes>

                                        <Route
                                            path="/"
                                            element={<Inicio />}
                                        />

                                        <Route
                                            path="/excursiones"
                                            element={<Excursiones />}
                                        />

                                        <Route path="/excursiones/:id" element={<ExcursionDetalle />} />

                                        <Route
                                            path="/login"
                                            element={<Login />}
                                        />

                                        <Route
                                            path="/registro"
                                            element={<Registro />}
                                        />

                                        <Route
                                            path="/perfil"
                                            element={
                                                <RutaProtegida>
                                                    <Perfil />
                                                </RutaProtegida>
                                            }
                                        />

                                        <Route
                                            path="/carrito"
                                            element={
                                                <RutaProtegida>
                                                    <Carrito />
                                                </RutaProtegida>
                                            }
                                        />

                                        <Route path="/checkout" element={<RutaProtegida><Checkout /></RutaProtegida>} />
                                        <Route path="/mis-pedidos" element={<RutaProtegida><MisPedidos /></RutaProtegida>} />
                                        <Route
                                            path="/favoritos"
                                            element={
                                                <RutaProtegida>
                                                    <Favoritos />
                                                </RutaProtegida>
                                            }
                                        />

                                    </Routes>

                                </main>

                                <Footer />

                            </div>
                        }
                    />

                </Routes>

            </BrowserRouter>
            </CartProvider>
        </AuthProvider>
    );
}

export default App;