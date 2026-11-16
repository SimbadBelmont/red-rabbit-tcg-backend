const mongoose = require('mongoose');

// Una entrada por carta deseada. Se avisa por correo cuando su precio baja del objetivo.
const wishlistSchema = new mongoose.Schema({
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    carta: { type: mongoose.Schema.Types.ObjectId, ref: 'Carta', required: true },
    precioObjetivo: { type: Number, required: true, min: 0 },
    ultimoAviso: Date,
}, { timestamps: true });

wishlistSchema.index({ usuario: 1, carta: 1 }, { unique: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);
