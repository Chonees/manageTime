const express = require('express');
const router = express.Router();
const savedLocationController = require('../controllers/savedLocation.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Obtener todas las ubicaciones guardadas del usuario
router.get('/', savedLocationController.getSavedLocations);

// Obtener una ubicación guardada específica
router.get('/:id', savedLocationController.getSavedLocationById);

// Crear una nueva ubicación guardada
router.post('/', savedLocationController.createSavedLocation);

// Actualizar una ubicación guardada
router.put('/:id', savedLocationController.updateSavedLocation);

// Eliminar una ubicación guardada
router.delete('/:id', savedLocationController.deleteSavedLocation);

module.exports = router;
