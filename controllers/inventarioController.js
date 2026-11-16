const Carta = require('../models/Carta');
const { leerInventario, PLANTILLA } = require('../services/csvService');
const { completarImagenesPendientes } = require('../services/scryfallService');
const { revisarCartas } = require('../services/alertasService');

const escaparRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// --- Catálogo público: solo cartas activas con stock ---
const catalogo = async (req, res) => {
    const { juego, expansion, rareza, condicion, q, orden = 'recientes' } = req.query;
    const pagina = Math.max(Number(req.query.pagina) || 1, 1);
    const porPagina = Math.min(Number(req.query.porPagina) || 24, 60);

    const filtro = { activa: true, stock: { $gt: 0 } };
    if (juego) filtro.juego = juego;
    if (expansion) filtro.expansion = expansion;
    if (rareza) filtro.rareza = { $in: String(rareza).split(',') };
    if (condicion) filtro.condicion = { $in: String(condicion).split(',') };
    if (q) filtro.nombre = { $regex: escaparRegex(String(q)), $options: 'i' };

    const ordenes = { recientes: { createdAt: -1 }, precio_asc: { precio: 1 }, precio_desc: { precio: -1 }, nombre: { nombre: 1 } };
    const [cartas, total] = await Promise.all([
        Carta.find(filtro).sort(ordenes[orden] || ordenes.recientes).skip((pagina - 1) * porPagina).limit(porPagina),
        Carta.countDocuments(filtro),
    ]);
    res.json({ cartas, total, pagina, paginas: Math.ceil(total / porPagina) });
};

const recientes = async (req, res) => {
    const cantidad = Math.min(Number(req.query.cantidad) || 8, 20);
    const cartas = await Carta.find({ activa: true, stock: { $gt: 0 } }).sort({ createdAt: -1 }).limit(cantidad);
    res.json(cartas);
};

const detalle = async (req, res) => {
    const carta = await Carta.findById(req.params.id);
    if (!carta || !carta.activa) return res.status(404).json({ error: 'Carta no encontrada' });
    res.json(carta);
};

// --- Gestión (staff/admin) ---
const listarTodo = async (req, res) => {
    const cartas = await Carta.find(req.query.juego ? { juego: req.query.juego } : {}).sort({ updatedAt: -1 }).limit(500);
    res.json(cartas);
};

const crear = async (req, res) => {
    const carta = await Carta.create(req.body);
    if (carta.juego === 'magic' && !carta.imagen) completarImagenesPendientes(5).catch(() => {});
    res.status(201).json(carta);
};

const actualizar = async (req, res) => {
    const carta = await Carta.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!carta) return res.status(404).json({ error: 'Carta no encontrada' });
    revisarCartas([carta]).catch(() => {});
    res.json(carta);
};

const eliminar = async (req, res) => {
    // Baja lógica: los pedidos antiguos siguen apuntando a la carta
    const carta = await Carta.findByIdAndUpdate(req.params.id, { activa: false }, { new: true });
    if (!carta) return res.status(404).json({ error: 'Carta no encontrada' });
    res.json({ ok: true });
};

// --- CSV: previsualizar (no guarda) y confirmar (guarda) ---
const plantillaCsv = (req, res) => {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla-inventario.csv"');
    res.send(PLANTILLA);
};

const previsualizarCsv = (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Sube un archivo CSV' });
    const { validas, errores, total } = leerInventario(req.file.buffer);
    res.json({ total, validas: validas.length, errores, muestra: validas.slice(0, 50) });
};

const importarCsv = async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Sube un archivo CSV' });
    const { validas, errores } = leerInventario(req.file.buffer);
    // modo 'sumar' agrega al stock existente; 'reemplazar' fija el stock del CSV
    const modo = req.body.modo === 'reemplazar' ? 'reemplazar' : 'sumar';

    const operaciones = validas.map((c) => {
        // null (y no undefined) para que una carta sin expansión no coincida con cualquier otra del mismo nombre
        const llave = { juego: c.juego, expansion: c.expansion ?? null, numero: c.numero ?? null, nombre: c.nombre, condicion: c.condicion, foil: c.foil, idioma: c.idioma };
        const { stock, precio } = c;
        const datos = { precio, activa: true, ...(c.rareza && { rareza: c.rareza }) };
        return {
            updateOne: {
                filter: llave,
                // En un upsert, Mongo copia los campos del filtro al documento nuevo
                update: modo === 'sumar'
                    ? { $inc: { stock }, $set: datos, $setOnInsert: { imagenEstado: 'pendiente' } }
                    : { $set: { ...datos, stock }, $setOnInsert: { imagenEstado: 'pendiente' } },
                upsert: true,
            },
        };
    });

    const resultado = operaciones.length ? await Carta.bulkWrite(operaciones, { ordered: false }) : null;

    // En segundo plano: arte de Scryfall y avisos de wishlist
    completarImagenesPendientes().catch((e) => console.error('Scryfall:', e.message));
    (validas.length ? Carta.find({ $or: validas.map((c) => ({ nombre: c.nombre, juego: c.juego })) }).limit(2000) : Promise.resolve([]))
        .then(revisarCartas).catch(() => {});

    res.json({
        modo,
        nuevas: resultado?.upsertedCount || 0,
        actualizadas: resultado?.modifiedCount || 0,
        errores,
    });
};

const sincronizarImagenes = async (req, res) => {
    const listas = await completarImagenesPendientes();
    res.json({ listas });
};

module.exports = { catalogo, recientes, detalle, listarTodo, crear, actualizar, eliminar, plantillaCsv, previsualizarCsv, importarCsv, sincronizarImagenes };
