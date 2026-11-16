// Avisos de wishlist: cuando una carta queda en o por debajo del precio objetivo y hay stock.
const Wishlist = require('../models/Wishlist');
const correo = require('./correoService');

const HORAS_ENTRE_AVISOS = 24;

async function revisarCartas(cartas) {
    if (!cartas.length) return 0;
    const porId = new Map(cartas.map((c) => [String(c._id), c]));
    const limiteAviso = new Date(Date.now() - HORAS_ENTRE_AVISOS * 3600 * 1000);

    const entradas = await Wishlist.find({
        carta: { $in: [...porId.keys()] },
        $or: [{ ultimoAviso: null }, { ultimoAviso: { $lt: limiteAviso } }],
    }).populate('usuario', 'nombre email');

    let enviados = 0;
    for (const w of entradas) {
        const carta = porId.get(String(w.carta));
        if (!carta || carta.stock < 1 || carta.precio > w.precioObjetivo || !w.usuario) continue;
        await correo.avisoWishlist({ email: w.usuario.email, nombre: w.usuario.nombre, carta, precioObjetivo: w.precioObjetivo });
        w.ultimoAviso = new Date();
        await w.save();
        enviados++;
    }
    return enviados;
}

module.exports = { revisarCartas };
