const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Todas las rutas de actividades requieren autenticación
router.use(verifyToken);

// Crear una nueva actividad
router.post('/', activityController.createActivity);

// Obtener todas las actividades del usuario
router.get('/', activityController.getUserActivities);

// Obtener actividades recientes para el dashboard
router.get('/recent', activityController.getRecentActivities);

// Obtener actividades específicas de una tarea
router.get('/task/:taskId', activityController.getTaskActivities);

// Obtener todas las actividades de todos los usuarios (admin)
router.get('/admin/all', activityController.getAllActivities);

// Eliminar una actividad
router.delete('/:activityId', activityController.deleteActivity);

module.exports = router;
