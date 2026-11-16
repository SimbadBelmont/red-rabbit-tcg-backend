require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// --- Importaciones de rutas ---
const authRoutes = require('./routes/authRoutes');
const inventarioRoutes = require('./routes/inventarioRoutes');
const pedidoRoutes = require('./routes/pedidoRoutes');
const eventoRoutes = require('./routes/eventoRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');

// Middleware
app.use(cors());
app.use(express.json());

// --- RUTA DE HEALTH CHECK ---
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Servidor operativo',
        timestamp: new Date()
    });
});

// --- Conexión a Base de Datos ---
const conectarBD = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 20000,
            socketTimeoutMS: 45000,
        });
        console.log('Conexión exitosa a MongoDB');
    } catch (err) {
        console.error('Error de conexión:', err);
        process.exit(1);
    }
};

// --- Manejo de errores globales ---
process.on('uncaughtException', (err) => {
    console.error('¡Error crítico no capturado!', err);
});

process.on('unhandledRejection', (reason) => {
    console.error('Promesa rechazada sin manejar:', reason);
});

// --- INICIO ASÍNCRONO DEL SERVIDOR ---
(async () => {
    // Esperamos la conexión a la base de datos antes de cargar rutas o abrir el puerto
    await conectarBD();

    // Rutas
    app.use('/api/auth', authRoutes);
    app.use('/api/inventario', inventarioRoutes);
    app.use('/api/pedidos', pedidoRoutes);
    app.use('/api/eventos', eventoRoutes);
    app.use('/api/wishlist', wishlistRoutes);

    // Errores no atrapados en las rutas (Express 5 pasa aquí los errores async)
    app.use((err, req, res, next) => {
        console.error('Error en ruta:', err.message);
        res.status(err.status || 500).json({ error: err.status ? err.message : 'Error interno del servidor' });
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => console.log(`Servidor corriendo en el puerto ${PORT}`));
})();
