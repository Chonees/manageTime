const express = require('express');
const router = express.Router();
const taskReportController = require('../controllers/taskReport.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Rutas para generar reportes (permiten token en query parameter)
router.get('/tasks', taskReportController.generateTaskReport);

// El resto de rutas de reportes requieren autenticación tradicional
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.isAdmin);

module.exports = router;
