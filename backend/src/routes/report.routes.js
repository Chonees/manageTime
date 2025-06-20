const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Rutas para generar reportes (permiten token en query parameter)
router.get('/activities/excel', reportController.generateActivityExcelReport);

// El resto de rutas de reportes requieren autenticación tradicional
router.use(verifyToken);

module.exports = router;
