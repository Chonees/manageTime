const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const auth = require('../middleware/auth');

// Rutas protegidas que requieren autenticación
router.use(auth);

// Ruta para registrar un token de notificaciones de administrador
router.post('/admin/register-token', notificationController.registerAdminToken);

// Ruta para enviar una notificación de prueba a todos los administradores
router.post('/admin/test', notificationController.sendTestNotification);

// Ruta para verificar si hay tokens de administradores registrados
router.get('/admin/check-tokens', notificationController.checkAdminTokens);

module.exports = router;
