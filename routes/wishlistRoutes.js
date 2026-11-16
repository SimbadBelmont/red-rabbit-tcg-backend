const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/authMiddleware');
const c = require('../controllers/wishlistController');

router.use(verificarToken);
router.get('/', c.listar);
router.post('/', c.agregar);
router.delete('/:id', c.quitar);

module.exports = router;
