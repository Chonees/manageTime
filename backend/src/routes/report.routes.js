const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Todas las rutas de reportes requieren autenticación
router.use(verifyToken);

// Ruta para generar reporte PDF de actividades (solo admin)
router.get('/activities/pdf', reportController.generateActivityReport);

module.exports = router;
