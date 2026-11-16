const Wishlist = require('../models/Wishlist');
const Carta = require('../models/Carta');

const listar = async (req, res) => {
    const items = await Wishlist.find({ usuario: req.user.id }).populate('carta').sort({ createdAt: -1 });
    res.json(items.filter((w) => w.carta));
};

const agregar = async (req, res) => {
    const { carta, precioObjetivo } = req.body;
    if (!(await Carta.exists({ _id: carta }))) return res.status(404).json({ error: 'Carta no encontrada' });
    const precio = Number(precioObjetivo);
    if (!Number.isFinite(precio) || precio < 0) return res.status(400).json({ error: 'Precio objetivo inválido' });

    const item = await Wishlist.findOneAndUpdate(
        { usuario: req.user.id, carta },
        { precioObjetivo: precio, ultimoAviso: null },
        { new: true, upsert: true },
    ).populate('carta');
    res.status(201).json(item);
};

const quitar = async (req, res) => {
    await Wishlist.deleteOne({ _id: req.params.id, usuario: req.user.id });
    res.json({ ok: true });
};

module.exports = { listar, agregar, quitar };
