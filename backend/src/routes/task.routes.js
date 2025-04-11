const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Rutas para tareas del usuario
router.get('/my-tasks', taskController.getMyTasks);
router.get('/nearby', taskController.getNearbyTasks); // Nueva ruta para buscar tareas cercanas
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

// Rutas para administradores
router.get('/all', isAdmin, taskController.getAllTasks);
router.post('/', isAdmin, taskController.createTask); // Solo administradores pueden crear tareas
router.post('/assign', isAdmin, taskController.createAssignedTask); // Nueva ruta para asignar tareas

module.exports = router;
