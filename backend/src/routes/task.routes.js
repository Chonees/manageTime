const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// Middleware para verificar token
router.use(verifyToken);

// Rutas accesibles para todos los usuarios autenticados
router.get('/my-tasks', taskController.getMyTasks);
router.get('/nearby', taskController.getNearbyTasks);
router.get('/active', (req, res) => taskController.getActiveTask(req, res)); // Obtener tarea activa (manos libres)
router.post('/note', (req, res) => taskController.addTaskNote(req, res)); // Añadir notas de voz
router.get('/:id', taskController.getTaskById); // Obtener una tarea específica
router.put('/:id', taskController.updateTask); // Actualizar una tarea (si es el propietario)
router.delete('/:id', taskController.deleteTask); // Eliminar una tarea (si es el propietario)

// Rutas para administradores
router.get('/', taskController.getAllTasks); // Obtener todas las tareas (filtradas según permisos)
router.post('/', taskController.createTask); // Crear una tarea (todos pueden, pero los admins tienen más opciones)
router.post('/assign', isAdmin, taskController.createAssignedTask); // Asignar tareas (solo admins)

module.exports = router;
