const mongoose = require('mongoose');

const eventoSchema = new mongoose.Schema({
    titulo: { type: String, required: true, trim: true },
    juego: { type: String, required: true },
    tipo: { type: String, enum: ['Torneo', 'Prerelease', 'Liga', 'Casual'], default: 'Torneo' },
    formato: String,
    descripcion: String,
    fecha: { type: Date, required: true },
    lugar: { type: String, default: 'Mesa central' },
    cupo: { type: Number, required: true, min: 1 },
    cuota: { type: Number, default: 0 },             // MXN
    // Enlace al evento en Wizards Event Locator (Magic / WPN)
    wotcUrl: String,
    inscritos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }],
    publicado: { type: Boolean, default: true },
}, { timestamps: true, toJSON: { virtuals: true } });

eventoSchema.virtual('disponibles').get(function () {
    return Math.max(this.cupo - (this.inscritos?.length || 0), 0);
});

module.exports = mongoose.model('Evento', eventoSchema);
