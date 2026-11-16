const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middleware/authMiddleware');
const c = require('../controllers/eventoController');

const staff = [verificarToken, verificarRol(['staff', 'admin'])];

router.get('/', c.proximos);
router.get('/mios', verificarToken, c.misEventos);
router.get('/:id', c.detalle);
router.post('/:id/reservar', verificarToken, c.reservar);
router.delete('/:id/reservar', verificarToken, c.cancelarReserva);

router.post('/', ...staff, c.crear);
router.put('/:id', ...staff, c.actualizar);
router.delete('/:id', ...staff, c.eliminar);
router.get('/:id/inscritos', ...staff, c.inscritos);

module.exports = router;
