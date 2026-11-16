const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/authMiddleware');
const c = require('../controllers/authController');

router.post('/registrar', c.registrar);
router.post('/login', c.login);
router.get('/perfil', verificarToken, c.perfil);
router.put('/perfil', verificarToken, c.actualizarPerfil);

module.exports = router;
