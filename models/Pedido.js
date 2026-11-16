const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    carta: { type: mongoose.Schema.Types.ObjectId, ref: 'Carta', required: true },
    nombre: String,          // copia del nombre al momento del pedido
    precio: Number,          // copia del precio al momento del pedido
    cantidad: { type: Number, required: true, min: 1 },
}, { _id: false });

const pedidoSchema = new mongoose.Schema({
    folio: { type: String, unique: true },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }, // opcional: pedidos de invitado
    cliente: {
        nombre: { type: String, required: true },
        email: { type: String, required: true, lowercase: true },
        telefono: String,
    },
    items: { type: [itemSchema], validate: (v) => v.length > 0 },
    total: { type: Number, required: true },
    notas: String,
    estado: {
        type: String,
        enum: ['pendiente', 'confirmado', 'listo', 'entregado', 'cancelado'],
        default: 'pendiente',
    },
    apartadoHasta: Date,
    origen: { type: String, enum: ['web', 'pos'], default: 'web' },
}, { timestamps: true });

module.exports = mongoose.model('Pedido', pedidoSchema);
