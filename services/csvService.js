// Lectura y validación del CSV de inventario.
// Columnas: nombre, juego, expansion, numero, rareza, condicion, idioma, foil, precio, stock
const { parse } = require('csv-parse/sync');
const { JUEGOS, CONDICIONES } = require('../models/Carta');

const COLUMNAS = ['nombre', 'juego', 'expansion', 'numero', 'rareza', 'condicion', 'idioma', 'foil', 'precio', 'stock'];
const PLANTILLA = `${COLUMNAS.join(',')}\nLightning Bolt,magic,2XM,141,uncommon,NM,en,false,25,4\nCharizard VMAX,pokemon,DAA,20,rare,NM,es,false,1600,1\n`;
const MAX_FILAS = 10000;

// Acepta nombres comunes además de los códigos internos
const ALIAS_JUEGO = {
    mtg: 'magic', 'magic the gathering': 'magic', 'magic: the gathering': 'magic',
    'pokémon': 'pokemon', 'pokemon tcg': 'pokemon',
    'one piece': 'onepiece', 'one piece tcg': 'onepiece',
    'yu-gi-oh': 'yugioh', 'yu-gi-oh!': 'yugioh', 'disney lorcana': 'lorcana',
};

function leerInventario(buffer) {
    const filas = parse(buffer, { columns: (h) => h.map((c) => c.trim().toLowerCase()), skip_empty_lines: true, trim: true, bom: true });
    if (filas.length > MAX_FILAS) {
        const e = new Error(`El archivo tiene ${filas.length} filas; el máximo es ${MAX_FILAS}`);
        e.status = 400;
        throw e;
    }

    const validas = [];
    const errores = [];
    filas.forEach((f, i) => {
        const linea = i + 2; // +1 encabezado, +1 base 1
        const juegoTxt = String(f.juego || '').toLowerCase();
        const carta = {
            nombre: f.nombre,
            juego: ALIAS_JUEGO[juegoTxt] || juegoTxt,
            expansion: f.expansion || undefined,
            numero: f.numero || undefined,
            rareza: f.rareza || undefined,
            condicion: String(f.condicion || 'NM').toUpperCase(),
            idioma: f.idioma || 'es',
            foil: ['true', 'si', 'sí', '1', 'foil'].includes(String(f.foil || '').toLowerCase()),
            precio: Number(String(f.precio || '').replace(/[$,\s]/g, '')),
            stock: Number(f.stock),
        };
        const problemas = [];
        if (!carta.nombre) problemas.push('falta nombre');
        if (!JUEGOS.includes(carta.juego)) problemas.push(`juego "${f.juego}" no reconocido`);
        if (!CONDICIONES.includes(carta.condicion)) problemas.push(`condición "${f.condicion}" no válida (${CONDICIONES.join(', ')})`);
        if (!Number.isFinite(carta.precio) || carta.precio < 0) problemas.push('precio inválido');
        if (!Number.isInteger(carta.stock) || carta.stock < 0) problemas.push('stock inválido');

        if (problemas.length) errores.push({ linea, problemas });
        else validas.push(carta);
    });
    return { validas, errores, total: filas.length };
}

module.exports = { leerInventario, COLUMNAS, PLANTILLA };
