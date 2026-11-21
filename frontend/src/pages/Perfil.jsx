// HACKATHON GRUPO 9 - PERFIL DEL CLIENTE
// Se conserva el perfil existente y se facilita el acceso a Mis reservas tras iniciar sesión.

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MisPedidos from './MisPedidos.jsx';
import { Link } from 'react-router-dom';
import { UserRound, ShieldCheck, CalendarCheck2, Save, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { obtenerPerfilUsuario, actualizarPerfilUsuario, cambiarContraseniaUsuario } from '../services/authService.js';

export default function Perfil() {
  const { usuario, actualizarUsuario } = useAuth();
  const [searchParams] = useSearchParams();
  const [seccion, setSeccion] = useState(searchParams.get('seccion') === 'reservas' ? 'reservas' : 'datos');
  useEffect(() => { if (searchParams.get('seccion') === 'reservas') setSeccion('reservas'); }, [searchParams]);
  const [form, setForm] = useState({nombre:'', apellido:'', email:'', telefono:''});
  const [password, setPassword] = useState({contraseniaActual:'',contraseniaNueva:'',confirmar:''});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(''); const [error, setError] = useState('');
  useEffect(()=>{let activo=true; obtenerPerfilUsuario().then(r=>{if(!activo)return; const u=r.data; setForm({nombre:u.nombre||'',apellido:u.apellido||'',email:u.email||'',telefono:u.telefono||''}); actualizarUsuario(u);}).catch(()=>{if(activo)setError('No se pudieron cargar tus datos.');}).finally(()=>{if(activo)setCargando(false);});return()=>{activo=false;};},[]);
  const cambiarSeccion=s=>{setSeccion(s);setError('');setMensaje('');};
  const guardar=async(e)=>{e.preventDefault();setError('');setMensaje('');setGuardando(true);try{const r=await actualizarPerfilUsuario(form);actualizarUsuario(r.usuario);setMensaje('Tus datos se actualizaron correctamente.');}catch(e){setError(e.response?.data?.mensaje||'No se pudieron guardar tus datos.');}finally{setGuardando(false);}};
  const cambiarClave=async(e)=>{e.preventDefault();setError('');setMensaje('');if(password.contraseniaNueva.length<10)return setError('La nueva contraseña debe tener al menos 10 caracteres.');if(password.contraseniaNueva!==password.confirmar)return setError('Las contraseñas nuevas no coinciden.');setGuardando(true);try{await cambiarContraseniaUsuario({contraseniaActual:password.contraseniaActual,contraseniaNueva:password.contraseniaNueva});setPassword({contraseniaActual:'',contraseniaNueva:'',confirmar:''});setMensaje('Tu contraseña se actualizó correctamente.');}catch(e){setError(e.response?.data?.mensaje||'No se pudo cambiar la contraseña.');}finally{setGuardando(false);}};
  const campo=(nombre,tipo='text')=><label className="block text-sm font-semibold text-slate-700" key={nombre}>{({nombre:'Nombre',apellido:'Apellido',email:'Correo electrónico',telefono:'Teléfono'})[nombre]}<input type={tipo} required={nombre==='nombre'||nombre==='email'} value={form[nombre]} onChange={e=>setForm(v=>({...v,[nombre]:e.target.value}))} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-orange-500"/></label>;
  return <section className="min-h-screen bg-slate-50 px-4 pb-16 pt-24 sm:px-6"><div className="mx-auto max-w-5xl space-y-6">
   <header className="rounded-3xl bg-slate-900 p-6 text-white sm:p-9"><p className="text-sm font-semibold text-orange-300">Mi espacio de viajes</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">¡Hola, {usuario?.nombre||form.nombre||'viajero'}! 👋</h1><p className="mt-3 max-w-xl text-slate-300">Qué bueno tenerte acá. Descubrí nuevas experiencias, organizá tus próximas salidas y mantené tu cuenta al día.</p><Link to="/excursiones" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white"><Compass size={18}/> Explorar excursiones</Link></header>
   <div className="grid gap-6 md:grid-cols-[215px_1fr]"><nav aria-label="Mi cuenta" className="flex gap-2 overflow-x-auto rounded-2xl bg-white p-3 shadow-sm md:flex-col">{[['datos',UserRound,'Mis datos'],['seguridad',ShieldCheck,'Seguridad'],['reservas',CalendarCheck2,'Mis reservas']].map(([id,Icon,t])=><button key={id} onClick={()=>cambiarSeccion(id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-semibold ${seccion===id?'bg-orange-100 text-orange-800':'text-slate-600 hover:bg-slate-100'}`}><Icon size={18}/>{t}</button>)}</nav>
   <main className="rounded-2xl bg-white p-5 shadow-sm sm:p-8">{mensaje&&<p role="status" className="mb-4 rounded-xl bg-green-50 p-4 text-green-800">{mensaje}</p>}{error&&<p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
   {seccion==='datos'&&<><h2 className="text-2xl font-bold text-slate-900">Información personal</h2><p className="mt-2 mb-6 text-slate-600">Estos datos se utilizarán para comunicarte información sobre tus reservas.</p>{cargando?<p>Cargando datos...</p>:<form onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">{campo('nombre')}{campo('apellido')}{campo('email','email')}{campo('telefono','tel')}<button type="submit" disabled={guardando} className="flex items-center justify-center gap-2 rounded-xl bg-orange-600 p-3 font-semibold text-white sm:col-span-2"><Save size={18}/>{guardando?'Guardando...':'Guardar mis datos'}</button></form>}</>}
   {seccion==='seguridad'&&<><h2 className="text-2xl font-bold text-slate-900">¿Querés cambiar tu contraseña?</h2><p className="my-3 text-slate-600">Para proteger tu cuenta, verificamos la contraseña actual antes de guardar una nueva.</p><form onSubmit={cambiarClave} className="max-w-xl space-y-4">{[['contraseniaActual','Contraseña actual'],['contraseniaNueva','Nueva contraseña (mínimo 10 caracteres)'],['confirmar','Repetir nueva contraseña']].map(([k,l])=><label key={k} className="block text-sm font-semibold">{l}<input type="password" autoComplete={k==='contraseniaActual'?'current-password':'new-password'} required value={password[k]} onChange={e=>setPassword(v=>({...v,[k]:e.target.value}))} className="mt-2 w-full rounded-xl border p-3"/></label>)}<button disabled={guardando} className="rounded-xl bg-orange-600 px-6 py-3 font-semibold text-white">{guardando?'Actualizando...':'Cambiar contraseña'}</button></form></>}
   {seccion==='reservas'&&<MisPedidos/>}
   </main></div></div></section>;
}
