const express = require('express');
const multer = require('multer');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middleware/authMiddleware');
const c = require('../controllers/inventarioController');

// El CSV se procesa en memoria (máx 5 MB, ~10.000 filas)
const subir = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const staff = [verificarToken, verificarRol(['staff', 'admin'])];

// --- Público: catálogo ---
router.get('/catalogo', c.catalogo);
router.get('/recientes', c.recientes);

// --- Staff: gestión de inventario ---
router.get('/', ...staff, c.listarTodo);
router.post('/', ...staff, c.crear);
router.get('/csv/plantilla', ...staff, c.plantillaCsv);
router.post('/csv/previsualizar', ...staff, subir.single('archivo'), c.previsualizarCsv);
router.post('/csv/importar', ...staff, subir.single('archivo'), c.importarCsv);
router.post('/imagenes/sincronizar', ...staff, c.sincronizarImagenes);
router.put('/:id', ...staff, c.actualizar);
router.delete('/:id', ...staff, c.eliminar);

// Al final para no chocar con las rutas de arriba
router.get('/:id', c.detalle);

module.exports = router;
