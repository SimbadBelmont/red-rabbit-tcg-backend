// Envío de correos con Nodemailer (pedidos, cambios de estado y avisos de wishlist).
// Si falta la configuración SMTP, los correos solo se muestran en consola (útil en desarrollo).
const nodemailer = require('nodemailer');
const { formatoMXN } = require('../utils/dinero');

const configurado = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
const transporte = configurado
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 465,
        secure: Number(process.env.SMTP_PORT || 465) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
    : null;

const TIENDA = process.env.NOMBRE_TIENDA || 'Red Rabbit TCG Store';
const escapar = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function enviar({ para, asunto, html }) {
    if (!configurado) {
        console.log(`[correo simulado] Para: ${para} | ${asunto}`);
        return;
    }
    try {
        await transporte.sendMail({ from: `"${TIENDA}" <${process.env.SMTP_USER}>`, to: para, subject: asunto, html });
    } catch (e) {
        // Un correo fallido no debe tumbar el pedido
        console.error('Error al enviar correo:', e.message);
    }
}

const tablaItems = (items) => `
<table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:14px">
  <tr style="background:#FDECEC"><th align="left" style="padding:8px">Carta</th><th style="padding:8px">Cant.</th><th align="right" style="padding:8px">Precio</th></tr>
  ${items.map((i) => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${escapar(i.nombre)}</td><td align="center" style="padding:8px;border-bottom:1px solid #eee">${i.cantidad}</td><td align="right" style="padding:8px;border-bottom:1px solid #eee">${formatoMXN(i.precio * i.cantidad)}</td></tr>`).join('')}
</table>`;

async function pedidoNuevo(pedido) {
    const detalle = `${tablaItems(pedido.items)}<p style="font-family:Arial,sans-serif"><b>Total: ${formatoMXN(pedido.total)}</b></p>`;
    const hasta = pedido.apartadoHasta ? pedido.apartadoHasta.toLocaleDateString('es-MX') : '';

    await enviar({
        para: pedido.cliente.email,
        asunto: `Recibimos tu pedido ${pedido.folio} — ${TIENDA}`,
        html: `<h2 style="font-family:Arial,sans-serif;color:#DF0E10">¡Gracias, ${escapar(pedido.cliente.nombre)}!</h2>
<p style="font-family:Arial,sans-serif">Apartamos tus cartas hasta el <b>${hasta}</b>. Te avisaremos cuando tu pedido esté listo para recoger. Pagas al recoger en tienda.</p>${detalle}`,
    });

    if (process.env.CORREO_TIENDA) {
        await enviar({
            para: process.env.CORREO_TIENDA,
            asunto: `Nuevo pedido ${pedido.folio} de ${pedido.cliente.nombre}`,
            html: `<p style="font-family:Arial,sans-serif">Cliente: ${escapar(pedido.cliente.nombre)} · ${escapar(pedido.cliente.email)} · ${escapar(pedido.cliente.telefono || 'sin teléfono')}</p>
${pedido.notas ? `<p style="font-family:Arial,sans-serif">Notas: ${escapar(pedido.notas)}</p>` : ''}${detalle}`,
        });
    }
}

const MENSAJES_ESTADO = {
    confirmado: 'Confirmamos tu pedido y ya está apartado.',
    listo: '¡Tu pedido está listo! Ya puedes pasar a recogerlo.',
    entregado: 'Tu pedido fue entregado. ¡Gracias por tu compra!',
    cancelado: 'Tu pedido fue cancelado y las cartas regresaron al inventario.',
};

async function cambioEstado(pedido) {
    const mensaje = MENSAJES_ESTADO[pedido.estado];
    if (!mensaje) return;
    await enviar({
        para: pedido.cliente.email,
        asunto: `Pedido ${pedido.folio}: ${pedido.estado}`,
        html: `<p style="font-family:Arial,sans-serif">${mensaje}</p>${tablaItems(pedido.items)}`,
    });
}

async function avisoWishlist({ email, nombre, carta, precioObjetivo }) {
    await enviar({
        para: email,
        asunto: `${carta.nombre} bajó de precio en ${TIENDA}`,
        html: `<p style="font-family:Arial,sans-serif">Hola ${escapar(nombre)}, <b>${escapar(carta.nombre)}</b> ahora cuesta <b>${formatoMXN(carta.precio)}</b> (tu precio objetivo era ${formatoMXN(precioObjetivo)}) y hay ${carta.stock} en existencia.</p>`,
    });
}

module.exports = { enviar, pedidoNuevo, cambioEstado, avisoWishlist };
