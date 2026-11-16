const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middleware/authMiddleware');
const c = require('../controllers/pedidoController');

const staff = [verificarToken, verificarRol(['staff', 'admin'])];

router.post('/', c.crear);                       // con o sin sesión
router.get('/mios', verificarToken, c.misPedidos);

router.get('/', ...staff, c.listar);
router.post('/pos', ...staff, c.ventaPos);
router.patch('/:id/estado', ...staff, c.cambiarEstado);

module.exports = router;
