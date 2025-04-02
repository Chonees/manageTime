const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Rutas para registrar ubicaciones
router.post('/start', locationController.startWork);
router.post('/end', locationController.endWork);

// Rutas para obtener historial
router.get('/my-history', locationController.getMyLocationHistory);

// Rutas para administradores
router.get('/user/:userId', isAdmin, locationController.getUserLocationHistory);

module.exports = router;
