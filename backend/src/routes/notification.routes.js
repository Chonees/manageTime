const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Rutas protegidas que requieren autenticación
router.use(verifyToken);

// Ruta para registrar un token de notificaciones de administrador
router.post('/admin/register-token', notificationController.registerAdminToken);

// Ruta para enviar una notificación de prueba a todos los administradores
router.post('/admin/test', notificationController.sendTestNotification);

// Ruta para verificar si hay tokens de administradores registrados
router.get('/admin/check-tokens', notificationController.checkAdminTokens);

module.exports = router;
