const Evento = require('../models/Evento');

const proximos = async (req, res) => {
    const filtro = { publicado: true, fecha: { $gte: new Date(Date.now() - 6 * 3600 * 1000) } };
    if (req.query.tipo) filtro.tipo = req.query.tipo;
    if (req.query.juego) filtro.juego = req.query.juego;
    const eventos = await Evento.find(filtro).sort({ fecha: 1 }).select('-inscritos').limit(50);
    // 'disponibles' necesita el conteo de inscritos sin exponer quiénes son
    const conteos = await Evento.aggregate([
        { $match: { _id: { $in: eventos.map((e) => e._id) } } },
        { $project: { n: { $size: '$inscritos' } } },
    ]);
    const mapa = new Map(conteos.map((c) => [String(c._id), c.n]));
    res.json(eventos.map((e) => {
        const n = mapa.get(String(e._id)) || 0;
        return { ...e.toObject({ virtuals: false }), inscritosTotal: n, disponibles: Math.max(e.cupo - n, 0) };
    }));
};

const detalle = async (req, res) => {
    const evento = await Evento.findById(req.params.id);
    if (!evento || !evento.publicado) return res.status(404).json({ error: 'Evento no encontrado' });
    const { inscritos, ...resto } = evento.toObject();
    res.json({ ...resto, inscritosTotal: inscritos.length, disponibles: Math.max(evento.cupo - inscritos.length, 0) });
};

// Reserva atómica: solo entra si hay cupo y el usuario no estaba inscrito
const reservar = async (req, res) => {
    const evento = await Evento.findOneAndUpdate(
        { _id: req.params.id, publicado: true, inscritos: { $ne: req.user.id }, $expr: { $lt: [{ $size: '$inscritos' }, '$cupo'] } },
        { $push: { inscritos: req.user.id } },
        { new: true },
    );
    if (!evento) {
        const existe = await Evento.findById(req.params.id).select('inscritos cupo');
        if (!existe) return res.status(404).json({ error: 'Evento no encontrado' });
        if (existe.inscritos.some((u) => String(u) === req.user.id)) return res.status(409).json({ error: 'Ya tienes un lugar en este evento' });
        return res.status(409).json({ error: 'El evento ya no tiene lugares' });
    }
    res.json({ ok: true, disponibles: evento.cupo - evento.inscritos.length });
};

const cancelarReserva = async (req, res) => {
    await Evento.updateOne({ _id: req.params.id }, { $pull: { inscritos: req.user.id } });
    res.json({ ok: true });
};

const misEventos = async (req, res) => {
    const eventos = await Evento.find({ inscritos: req.user.id }).sort({ fecha: 1 }).select('-inscritos');
    res.json(eventos);
};

// --- Staff ---
const crear = async (req, res) => res.status(201).json(await Evento.create(req.body));

const actualizar = async (req, res) => {
    const { inscritos, ...cambios } = req.body; // los inscritos solo cambian con reservar/cancelar
    const evento = await Evento.findByIdAndUpdate(req.params.id, cambios, { new: true, runValidators: true });
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json(evento);
};

const eliminar = async (req, res) => {
    await Evento.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
};

const inscritos = async (req, res) => {
    const evento = await Evento.findById(req.params.id).populate('inscritos', 'nombre email telefono wizardsId');
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json(evento.inscritos);
};

module.exports = { proximos, detalle, reservar, cancelarReserva, misEventos, crear, actualizar, eliminar, inscritos };
