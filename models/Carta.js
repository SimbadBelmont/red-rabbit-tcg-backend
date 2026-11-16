const mongoose = require('mongoose');

const JUEGOS = ['magic', 'pokemon', 'onepiece', 'yugioh', 'lorcana', 'otro'];
const CONDICIONES = ['NM', 'LP', 'MP', 'HP', 'DMG'];

const cartaSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true },
    juego: { type: String, enum: JUEGOS, required: true },
    expansion: { type: String, trim: true },        // código o nombre de la expansión (ej: "MH3")
    numero: { type: String, trim: true },           // número de colección; con expansión, búsqueda exacta en Scryfall
    rareza: { type: String, trim: true },
    condicion: { type: String, enum: CONDICIONES, default: 'NM' },
    idioma: { type: String, default: 'es' },
    foil: { type: Boolean, default: false },
    precio: { type: Number, required: true, min: 0 },   // MXN
    stock: { type: Number, required: true, min: 0, default: 0 },

    // Imagen: de Scryfall para Magic, o foto subida por la tienda para lo demás
    imagen: { type: String },
    scryfallId: { type: String },
    artista: { type: String },
    imagenEstado: { type: String, enum: ['pendiente', 'lista', 'sin_imagen'], default: 'pendiente' },

    activa: { type: Boolean, default: true },
}, { timestamps: true });

// Evita duplicar la misma carta física (misma impresión y condición)
cartaSchema.index({ juego: 1, expansion: 1, numero: 1, nombre: 1, condicion: 1, foil: 1, idioma: 1 }, { unique: true });
cartaSchema.index({ nombre: 'text', expansion: 'text' });

module.exports = mongoose.model('Carta', cartaSchema);
module.exports.JUEGOS = JUEGOS;
module.exports.CONDICIONES = CONDICIONES;
