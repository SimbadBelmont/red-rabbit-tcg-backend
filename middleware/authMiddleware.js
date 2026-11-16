const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    const authHeader = req.header('Authorization');

    // Si el header no existe o no empieza con 'Bearer '
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Formato de token inválido' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Guardamos el objeto decodificado (con id y rol) en req.user
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        console.error('Fallo en verificación JWT:', error.message);
        return res.status(401).json({ error: 'Token no válido o expirado' });
    }
};

// Roles: 'cliente' | 'staff' | 'admin'. Se usa después de verificarToken.
const verificarRol = (rolesPermitidos) => (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
        return res.status(403).json({ error: 'Acceso denegado: rol insuficiente' });
    }
    next();
};

module.exports = { verificarToken, verificarRol };
