// Crea (o promueve) una cuenta de staff/admin.
// Uso: node scripts/crearAdmin.js correo@ejemplo.com "Nombre" contraseña [admin|staff]
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');

(async () => {
    const [email, nombre, password, rol = 'admin'] = process.argv.slice(2);
    if (!email || !nombre || !password) {
        console.log('Uso: node scripts/crearAdmin.js correo "Nombre" contraseña [admin|staff]');
        process.exit(1);
    }
    await mongoose.connect(process.env.MONGO_URI);
    const usuario = await Usuario.findOneAndUpdate(
        { email: email.toLowerCase() },
        { nombre, rol, password: await bcrypt.hash(password, 10) },
        { new: true, upsert: true },
    );
    console.log(`Listo: ${usuario.email} es ${usuario.rol}`);
    await mongoose.disconnect();
})();
