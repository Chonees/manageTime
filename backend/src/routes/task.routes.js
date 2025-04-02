const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Rutas para tareas del usuario
router.post('/', taskController.createTask);
router.get('/my-tasks', taskController.getMyTasks);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

// Rutas para administradores
router.get('/all', isAdmin, taskController.getAllTasks);

module.exports = router;
