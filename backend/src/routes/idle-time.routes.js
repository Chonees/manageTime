const express = require('express');
const router = express.Router();
const idleTimeController = require('../controllers/idle-time.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Rutas para manejo de tiempo idle
router.post('/start', idleTimeController.startSession);
router.post('/end', idleTimeController.endSession);
router.post('/update-radius', idleTimeController.updateTaskRadius);
router.get('/stats', idleTimeController.getStats);

// Rutas administrativas
router.get('/history', isAdmin, idleTimeController.getHistoryByUser);

module.exports = router;
