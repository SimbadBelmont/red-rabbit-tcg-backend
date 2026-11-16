const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    telefono: { type: String, trim: true },
    rol: { type: String, enum: ['cliente', 'staff', 'admin'], default: 'cliente' },
    // Nickname / Wizards Account para inscribir en eventos WPN
    wizardsId: { type: String, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('Usuario', usuarioSchema);
