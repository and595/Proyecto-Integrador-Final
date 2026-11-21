import { useEffect, useState } from "react";
import { obtenerEmpresa, guardarEmpresa } from "../../services/adminService.js";
function AdminEmpresa() {
  const [form, setForm] = useState({
      nombre: "Descubre Córdoba",
      whatsapp: "",
      email: "",
    }),
    [mensaje, setMensaje] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    obtenerEmpresa()
      .then((d) => {
        if (d)
          setForm({
            nombre: d.nombre || "",
            whatsapp: d.whatsapp || "",
            email: d.email || "",
          });
      })
      .catch((e) => setError(e.message));
  }, []);
  const guardar = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");
    try {
      await guardarEmpresa(form);
      setMensaje("Datos comerciales guardados");
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <section className="mx-auto max-w-xl space-y-5 text-white">
      <h2 className="text-2xl font-bold">Configuración de empresa</h2>
      <p className="text-sm text-slate-400">
        Estos datos aparecen en los correos de reservas y se usan como contactos
        comerciales. No incluyen contraseñas SMTP.
      </p>
      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
      {mensaje && <p className="text-emerald-300">{mensaje}</p>}
      <form
        onSubmit={guardar}
        className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-5"
      >
        {[
          ["nombre", "Nombre comercial", "text"],
          [
            "whatsapp",
            "WhatsApp comercial (Argentina: 549 + código de área y número)",
            "tel",
          ],
          ["email", "Email de contacto", "email"],
        ].map(([k, label, tipo]) => (
          <label key={k} className="block text-sm">
            {label}
            <input
              type={tipo}
              required={k === "nombre"}
              value={form[k]}
              onChange={(e) => setForm((v) => ({ ...v, [k]: e.target.value }))}
              className="mt-1 block w-full rounded-lg bg-slate-800 p-3 text-white"
            />
          </label>
        ))}
        <button className="rounded-lg bg-orange-600 px-5 py-3 font-semibold">
          Guardar cambios
        </button>
      </form>
    </section>
  );
}
export default AdminEmpresa;
