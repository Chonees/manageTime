const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Ruta para generar reporte PDF de actividades (permite token en query parameter)
router.get('/activities/pdf', reportController.generateActivityReport);

// El resto de rutas de reportes requieren autenticación tradicional
router.use(verifyToken);

module.exports = router;
