const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// Middleware para verificar token
router.use(verifyToken);

// Rutas accesibles para todos los usuarios autenticados
router.get('/my-tasks', (req, res) => taskController.getMyTasks(req, res));
router.get('/nearby', (req, res) => taskController.getNearbyTasks(req, res));
router.get('/active', (req, res) => taskController.getActiveTask(req, res)); // Obtener tarea activa (manos libres)
router.post('/note', (req, res) => taskController.addTaskNote(req, res)); // Añadir notas de voz
router.get('/:id', (req, res) => taskController.getTaskById(req, res)); // Obtener una tarea específica
router.put('/:id', (req, res) => taskController.updateTask(req, res)); // Actualizar una tarea (si es el propietario)
router.delete('/:id', (req, res) => taskController.deleteTask(req, res)); // Eliminar una tarea (si es el propietario)

// Endpoint para notas de voz
router.post('/tasks/:taskId/note', (req, res) => taskController.addSimpleVoiceNote(req, res));

// Rutas para administradores
router.get('/', (req, res) => taskController.getAllTasks(req, res)); // Obtener todas las tareas (filtradas según permisos)
router.post('/', (req, res) => taskController.createTask(req, res)); // Crear una tarea (todos pueden, pero los admins tienen más opciones)
router.post('/assign', isAdmin, (req, res) => taskController.createAssignedTask(req, res)); // Asignar tareas (solo admins)

module.exports = router;
