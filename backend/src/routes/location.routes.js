const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Rutas para registrar ubicaciones
router.post('/start', locationController.startWork);
router.post('/end', locationController.endWork);
// Ruta de puntos de seguimiento eliminada

// Rutas para obtener historial
router.get('/my-history', locationController.getMyLocationHistory);
router.get('/history-with-tasks', locationController.getMyLocationHistoryWithTasks);
router.get('/history-with-tasks/:userId', isAdmin, locationController.getUserLocationHistoryWithTasks);

// Rutas para administradores
router.get('/user/:userId', isAdmin, locationController.getUserLocationHistory);

module.exports = router;
