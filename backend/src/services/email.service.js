
import nodemailer from "nodemailer";

// =====================================================
// 1. FUNCIONES AUXILIARES
// =====================================================

// Evita que los datos ingresados por usuarios se
// interpreten como código HTML dentro del correo.
const esc = (valor) =>
  String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[caracter]);

// Obtiene la dirección del frontend desde el .env.
// Si no está configurada, utiliza localhost.
const base = () =>
  (process.env.FRONTEND_URL || "http://localhost:5173")
    .replace(/\/$/, "");

// Genera el enlace para consultar una compra.
const enlaceCompra = (id) =>
  `${base()}/perfil?seccion=reservas&compra=${encodeURIComponent(id)}`;

// Genera el enlace para consultar el detalle
// de una reserva y sus mensajes.
const enlaceDetalle = (id) =>
  `${base()}/perfil?seccion=reservas&detalle=${encodeURIComponent(id)}`;

// Convierte un número al formato argentino.
// Ejemplo: 15000 -> 15.000
const dinero = (valor) =>
  Number(valor || 0).toLocaleString("es-AR");


// =====================================================
// 2. CONFIGURACIÓN DEL ENVÍO DE CORREOS (SMTP)
// =====================================================

// Comprueba que estén configuradas las variables
// necesarias para enviar correos desde el backend.
const smtpListo = () =>
  Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD &&
    process.env.SMTP_FROM
  );

// Crea el transporte de Nodemailer.
//
// Nodemailer es la librería que permite enviar emails.
// Los datos de conexión se obtienen del archivo .env.
const transporte = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,

    port: Number(process.env.SMTP_PORT || 587),

    // El puerto 465 utiliza TLS desde el inicio.
    secure: Number(process.env.SMTP_PORT || 587) === 465,

    // Credenciales del servidor de correo.
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });


// =====================================================
// 3. PLANTILLA GENERAL DE LOS CORREOS
// =====================================================

// Esta función crea el diseño HTML que comparten
// todos los correos enviados por Descubre Córdoba.
//
// Recibe:
// saludo   -> nombre del cliente
// titulo   -> título principal del correo
// estado   -> estado de la reserva
// contenido -> información específica del mensaje
// url      -> enlace para ingresar a la plataforma
// boton    -> texto del botón
function correo({
  saludo,
  titulo,
  estado,
  contenido,
  url,
  boton = "Ver mi reserva y responder",
}) {

  // Si existe una URL, agrega un botón al correo.
  const accion = url
    ? `<a href="${esc(url)}"
          style="
            display:inline-block;
            background:#f97316;
            color:#fff;
            text-decoration:none;
            padding:14px 20px;
            border-radius:10px;
            font-weight:700;
          ">
          ${esc(boton)}
       </a>`
    : "";

  // Devuelve el HTML completo del correo.
  return `
    <!doctype html>
    <html lang="es">

      <body style="
        margin:0;
        background:#f1f5f9;
        padding:24px 10px;
        font-family:Arial,sans-serif;
        color:#17243b;
      ">

        <div style="
          max-width:580px;
          margin:auto;
          background:#fff;
          border-radius:16px;
          overflow:hidden;
          border:1px solid #e2e8f0;
        ">

          <!-- ENCABEZADO -->
          <div style="
            padding:25px;
            background:#17243b;
            text-align:center;
            color:#fff;
          ">
            <h1 style="margin:0;font-size:25px">
              Descubre Córdoba
            </h1>

            <p style="margin:8px 0 0;color:#fed7aa">
              Tu próxima aventura comienza acá
            </p>
          </div>

          <!-- CONTENIDO PRINCIPAL -->
          <div style="padding:25px">

            <h2 style="margin:0 0 12px;font-size:22px">
              ${esc(titulo)}
            </h2>

            <p>¡Hola, ${esc(saludo || "viajero")}!</p>

            ${
              estado
                ? `<p style="
                     display:inline-block;
                     padding:7px 12px;
                     background:#fff7ed;
                     border-radius:20px;
                     color:#9a3412;
                     font-weight:bold;
                   ">
                     ${esc(estado)}
                   </p>`
                : ""
            }

            ${contenido}

            <!-- BOTÓN PARA INGRESAR A LA RESERVA -->
            <p style="margin:25px 0;text-align:center">
              ${accion}
            </p>

            <p style="color:#64748b;font-size:13px">
              Para consultar tus mensajes y reservas,
              ingresá con tu cuenta.

              Si el enlace no funciona, entrá a
              Descubre Córdoba desde tu navegador.
            </p>

          </div>

          <!-- PIE DEL CORREO -->
          <div style="
            padding:16px;
            background:#f8fafc;
            text-align:center;
            color:#64748b;
            font-size:12px;
          ">
            Descubre Córdoba · Información sobre tus excursiones
          </div>

        </div>
      </body>
    </html>
  `;
}


// =====================================================
// 4. RESUMEN DE LA RESERVA
// =====================================================

// Genera un bloque HTML con los datos de las
// excursiones incluidas en una compra.
function resumen(detalles, compra) {

  // Recorre cada excursión y genera una fila HTML.
  const filas = (detalles || [])
    .map(
      (detalle) => `
        <div style="margin:12px 0">

          <strong>
            ${esc(detalle.nombre || "Excursión")}
          </strong>

          <br>

          <span style="color:#475569">
            Salida:
            ${esc(String(detalle.fecha || "").slice(0, 10))}

            · ${esc(detalle.cantidad)} persona(s)
          </span>

        </div>
      `
    )
    .join("");

  // Devuelve el resumen con todas las excursiones
  // y el importe total de la compra.
  return `
    <div style="
      background:#f8fafc;
      border:1px solid #e2e8f0;
      border-radius:12px;
      padding:16px;
    ">

      ${filas}

      <div style="
        border-top:1px solid #cbd5e1;
        padding-top:12px;
      ">
        <strong>
          Total: $${dinero(compra.total)}
        </strong>
      </div>

    </div>
  `;
}


// =====================================================
// 5. EMAIL: SOLICITUD DE RESERVA RECIBIDA
// =====================================================

// Se utiliza cuando el cliente realiza una reserva.
//
// El email informa:
// - Que la solicitud fue recibida.
// - Qué excursiones reservó.
// - Cuál es el importe total.
// - Que el pago todavía está pendiente.
// - Cómo comunicarse con la agencia.
export async function enviarConfirmacionReserva({
  destinatario,
  nombre,
  compra,
  detalles,
  empresa,
}) {

  // Si falta el destinatario o la configuración SMTP,
  // no se intenta enviar el correo.
  if (!destinatario || !smtpListo()) {
    return false;
  }

  // Convierte la fecha de vencimiento al formato
  // argentino, si la compra tiene ese dato.
  const vencimiento = compra.venceEn
    ? new Date(compra.venceEn).toLocaleString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
      })
    : null;

  // Construye el contenido específico del email.
  const contenido = `
    <p>
      Recibimos tu solicitud de reserva.
      Te compartimos los datos:
    </p>

    ${resumen(detalles, compra)}

    <p>
      <strong>El pago todavía está pendiente.</strong>

      ${
        vencimiento
          ? `Plazo indicado: ${esc(vencimiento)}.`
          : "Consultá el plazo de pago con la agencia."
      }
    </p>

    <p>
      Para coordinarlo, comunicate con la agencia

      ${
        empresa?.whatsapp
          ? ` al ${esc(empresa.whatsapp)}`
          : ""
      }

      ${
        empresa?.email
          ? ` o a ${esc(empresa.email)}`
          : ""
      }.

      Este mensaje no confirma que el pago
      se haya realizado.
    </p>
  `;

  // Envía el correo utilizando Nodemailer.
  await transporte().sendMail({
    from: process.env.SMTP_FROM,
    to: destinatario,
    subject: "Descubre Córdoba | Recibimos tu reserva",

    html: correo({
      saludo: nombre,
      titulo: "¡Recibimos tu reserva!",
      estado: "Pendiente de pago",
      contenido,
      url: enlaceCompra(compra.id),
    }),
  });

  // Devuelve true cuando Nodemailer completó
  // correctamente la operación de envío.
  return true;
}


// =====================================================
// 6. EMAIL: RESERVA CONFIRMADA
// =====================================================

// Se utiliza cuando el sistema determina que
// el pago fue verificado y la reserva está confirmada.
//
// Esta función solamente envía el correo.
// NO verifica el pago ni cambia el estado en la BD.
export async function enviarReservaConfirmada({
  destinatario,
  nombre,
  compra,
  detalles,
}) {

  // Comprueba que sea posible enviar el correo.
  if (!destinatario || !smtpListo()) {
    return false;
  }

  // Contenido que verá el cliente.
  const contenido = `
    <p>
      Tu pago fue verificado y tu reserva
      está confirmada.
    </p>

    ${resumen(detalles, compra)}

    <p>
      Podés ver los detalles de tu viaje
      y escribirle a la agencia desde tu cuenta.
    </p>
  `;

  // Envía la confirmación al cliente.
  await transporte().sendMail({
    from: process.env.SMTP_FROM,
    to: destinatario,

    subject:
      "Descubre Córdoba | ¡Tu reserva está confirmada!",

    html: correo({
      saludo: nombre,
      titulo: "¡Tu reserva está confirmada!",
      estado: "Confirmada",
      contenido,
      url: enlaceCompra(compra.id),
    }),
  });

  return true;
}


// =====================================================
// 7. EMAIL: AVISO DE NUEVO MENSAJE
// =====================================================

// Notifica al cliente cuando la agencia deja
// un mensaje o una actualización en su reserva.
//
// No incluye el mensaje privado dentro del email.
// El cliente debe ingresar a la plataforma para leerlo.
export async function enviarAvisoMensaje({
  destinatario,
  idDetalle,
}) {

  // Comprueba destinatario y configuración SMTP.
  if (!destinatario || !smtpListo()) {
    return false;
  }

  try {

    // Intenta enviar el email de notificación.
    await transporte().sendMail({
      from: process.env.SMTP_FROM,
      to: destinatario,

      subject:
        "Descubre Córdoba | Tenés una novedad en tu reserva",

      html: correo({
        titulo: "Tenés una novedad en tu reserva",

        contenido: `
          <p>
            La agencia dejó una actualización
            o mensaje en tu reserva.

            Ingresá para leerlo y responder.
          </p>
        `,

        url: enlaceDetalle(idDetalle),
      }),
    });

    return true;

  } catch (error) {

    // Si falla el email, registra el error en consola.
    // Devuelve false en lugar de lanzar la excepción.
    console.error(
      "Falló aviso de mensaje:",
      error.message
    );

    return false;
  }
}


// =====================================================
// 8. EMAIL: CAMBIO DE ESTADO DE UNA RESERVA
// =====================================================

// Reutiliza el mismo aviso de novedades.
//
// Actualmente NO envía un texto diferente según
// el nuevo estado: usa enviarAvisoMensaje().
export const enviarCambioEstado = async ({
  destinatario,
  idDetalle,
}) => {

  return enviarAvisoMensaje({
    destinatario,
    idDetalle,
  });
};
