const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Rutas para estadísticas (solo admin)
router.get('/', isAdmin, statsController.getStats);
router.get('/recent-activity', isAdmin, statsController.getRecentActivity);

module.exports = router;
