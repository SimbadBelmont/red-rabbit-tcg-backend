// Todo lo relacionado con Scryfall (arte y datos de cartas de Magic).
// Reglas de Scryfall: User-Agent propio + Accept, máx ~10 peticiones/s
// (las búsquedas y /cards/collection: 2/s), y dar crédito a Scryfall y al artista.
// La imagen se consulta UNA vez y se guarda en la carta; el catálogo nunca llama a Scryfall.
const axios = require('axios');
const Carta = require('../models/Carta');

const scryfall = axios.create({
    baseURL: 'https://api.scryfall.com',
    timeout: 15000,
    headers: {
        'User-Agent': process.env.SCRYFALL_USER_AGENT || 'RedRabbitTCG/1.0',
        Accept: 'application/json;q=0.9,*/*;q=0.8',
    },
});

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// Las cartas de dos caras guardan sus imágenes en card_faces
const datosDeImagen = (c) => {
    const fuente = c.image_uris ? c : c.card_faces?.[0];
    return {
        scryfallId: c.id,
        imagen: fuente?.image_uris?.normal || null,
        artista: c.artist || fuente?.artist || null,
    };
};

// Una sola carta (búsqueda exacta por expansión + número, o por nombre)
async function buscarCarta({ expansion, numero, nombre }) {
    try {
        const { data } = expansion && numero
            ? await scryfall.get(`/cards/${encodeURIComponent(expansion.toLowerCase())}/${encodeURIComponent(numero)}`)
            : await scryfall.get('/cards/named', { params: { exact: nombre, ...(expansion && { set: expansion }) } });
        return datosDeImagen(data);
    } catch (e) {
        if (e.response?.status === 404) return null;
        throw e;
    }
}

// Lotes de hasta 75 cartas por petición (/cards/collection), 1 petición cada 600 ms
async function buscarLote(cartas) {
    const resultados = new Map();
    for (let i = 0; i < cartas.length; i += 75) {
        const grupo = cartas.slice(i, i + 75);
        const identifiers = grupo.map((c) => (c.expansion && c.numero
            ? { set: c.expansion.toLowerCase(), collector_number: String(c.numero) }
            : { name: c.nombre }));
        try {
            const { data } = await scryfall.post('/cards/collection', { identifiers });
            for (const card of data.data || []) {
                const llaveSet = `${card.set}|${card.collector_number}`;
                resultados.set(llaveSet, datosDeImagen(card));
                resultados.set(`nombre|${card.name.toLowerCase()}`, datosDeImagen(card));
            }
        } catch (e) {
            if (e.response?.status === 429) {
                // No se ignora un 429: esperamos y reintentamos el mismo grupo una vez
                await esperar(2000);
                i -= 75;
                continue;
            }
            console.error('Error en Scryfall (lote):', e.message);
        }
        await esperar(600);
    }
    return resultados;
}

// Completa la imagen de las cartas de Magic que aún no la tienen
async function completarImagenesPendientes(limite = 300) {
    const pendientes = await Carta.find({ juego: 'magic', imagenEstado: 'pendiente' }).limit(limite);
    if (pendientes.length === 0) return 0;

    const mapa = await buscarLote(pendientes);
    let listas = 0;
    for (const carta of pendientes) {
        const dato = mapa.get(`${(carta.expansion || '').toLowerCase()}|${carta.numero}`)
            || mapa.get(`nombre|${carta.nombre.toLowerCase()}`);
        if (dato?.imagen) {
            Object.assign(carta, dato, { imagenEstado: 'lista' });
            listas++;
        } else {
            carta.imagenEstado = 'sin_imagen';
        }
        await carta.save();
    }
    return listas;
}

module.exports = { buscarCarta, buscarLote, completarImagenesPendientes };
