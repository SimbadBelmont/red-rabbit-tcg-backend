const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Carta = require('../models/Carta');
const Pedido = require('../models/Pedido');
const correo = require('../services/correoService');
const { sumarDias } = require('../utils/fecha');

const generarFolio = () => `RR-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

// El pedido puede hacerse con o sin sesión: si viene un token válido, se liga al usuario
const usuarioOpcional = (req) => {
    const h = req.header('Authorization');
    if (!h?.startsWith('Bearer ')) return null;
    try { return jwt.verify(h.split(' ')[1], process.env.JWT_SECRET); } catch { return null; }
};

// Aparta (descuenta) stock carta por carta. Si alguna no alcanza, regresa lo ya apartado.
async function apartarStock(items) {
    const apartados = [];
    for (const it of items) {
        const carta = await Carta.findOneAndUpdate(
            { _id: it.carta, activa: true, stock: { $gte: it.cantidad } },
            { $inc: { stock: -it.cantidad } },
            { new: true },
        );
        if (!carta) {
            await liberarStock(apartados);
            const ref = await Carta.findById(it.carta).select('nombre stock');
            const e = new Error(ref ? `Solo quedan ${ref.stock} de "${ref.nombre}"` : 'Una de las cartas ya no existe');
            e.status = 409;
            throw e;
        }
        apartados.push({ carta: carta._id, nombre: carta.nombre, precio: carta.precio, cantidad: it.cantidad });
    }
    return apartados;
}

async function liberarStock(items) {
    for (const it of items) await Carta.updateOne({ _id: it.carta }, { $inc: { stock: it.cantidad } });
}

const crear = async (req, res) => {
    const { cliente, items, notas } = req.body;
    if (!cliente?.nombre || !cliente?.email) return res.status(400).json({ error: 'Nombre y correo son obligatorios' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Tu pedido está vacío' });

    // Junta cantidades repetidas de la misma carta
    const agrupados = Object.values(items.reduce((acc, it) => {
        const cantidad = Math.max(parseInt(it.cantidad, 10) || 0, 0);
        if (!it.carta || cantidad < 1) return acc;
        acc[it.carta] = { carta: it.carta, cantidad: (acc[it.carta]?.cantidad || 0) + cantidad };
        return acc;
    }, {}));
    if (agrupados.length === 0) return res.status(400).json({ error: 'Tu pedido está vacío' });

    const apartados = await apartarStock(agrupados);
    const total = apartados.reduce((s, i) => s + i.precio * i.cantidad, 0);
    const usuario = usuarioOpcional(req);

    let pedido;
    try {
        pedido = await Pedido.create({
            folio: generarFolio(),
            usuario: usuario?.id,
            cliente: { nombre: cliente.nombre, email: cliente.email, telefono: cliente.telefono },
            items: apartados,
            total,
            notas,
            apartadoHasta: sumarDias(Number(process.env.DIAS_APARTADO) || 3),
        });
    } catch (e) {
        await liberarStock(apartados);
        throw e;
    }

    correo.pedidoNuevo(pedido).catch(() => {});
    res.status(201).json(pedido);
};

const misPedidos = async (req, res) => {
    const pedidos = await Pedido.find({ usuario: req.user.id }).sort({ createdAt: -1 });
    res.json(pedidos);
};

// --- Staff ---
const listar = async (req, res) => {
    const filtro = req.query.estado ? { estado: req.query.estado } : {};
    const pedidos = await Pedido.find(filtro).sort({ createdAt: -1 }).limit(200);
    res.json(pedidos);
};

const TRANSICIONES = {
    pendiente: ['confirmado', 'cancelado'],
    confirmado: ['listo', 'cancelado'],
    listo: ['entregado', 'cancelado'],
    entregado: [],
    cancelado: [],
};

const cambiarEstado = async (req, res) => {
    const { estado } = req.body;
    const pedido = await Pedido.findById(req.params.id);
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    if (!TRANSICIONES[pedido.estado].includes(estado)) {
        return res.status(400).json({ error: `No se puede pasar de "${pedido.estado}" a "${estado}"` });
    }
    if (estado === 'cancelado') await liberarStock(pedido.items);
    pedido.estado = estado;
    await pedido.save();
    correo.cambioEstado(pedido).catch(() => {});
    res.json(pedido);
};

// Venta directa en mostrador (Punto de Venta): descuenta stock y queda entregada
const ventaPos = async (req, res) => {
    const { items, cliente } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'La venta está vacía' });
    const apartados = await apartarStock(items.map((i) => ({ carta: i.carta, cantidad: Math.max(parseInt(i.cantidad, 10) || 1, 1) })));
    const pedido = await Pedido.create({
        folio: generarFolio(),
        cliente: { nombre: cliente?.nombre || 'Mostrador', email: cliente?.email || process.env.CORREO_TIENDA || 'mostrador@local' },
        items: apartados,
        total: apartados.reduce((s, i) => s + i.precio * i.cantidad, 0),
        estado: 'entregado',
        origen: 'pos',
    });
    res.status(201).json(pedido);
};

module.exports = { crear, misPedidos, listar, cambiarEstado, ventaPos };
