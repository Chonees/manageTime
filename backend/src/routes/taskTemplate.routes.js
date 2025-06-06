const express = require('express');
const router = express.Router();
const taskTemplateController = require('../controllers/taskTemplate.controller');
const authMiddleware = require('../middleware/auth');

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// Rutas para plantillas de tareas
router.post('/', taskTemplateController.createTaskTemplate);
router.get('/', taskTemplateController.getTaskTemplates);
router.get('/:id', taskTemplateController.getTaskTemplateById);
router.put('/:id', taskTemplateController.updateTaskTemplate);
router.delete('/:id', taskTemplateController.deleteTaskTemplate);

module.exports = router;
