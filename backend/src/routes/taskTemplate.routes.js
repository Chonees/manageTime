const express = require('express');
const router = express.Router();
const taskTemplateController = require('../controllers/taskTemplate.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Aplicar middleware de autenticación a todas las rutas
router.use(verifyToken);

// Rutas para plantillas de tareas
router.post('/', taskTemplateController.createTaskTemplate);
router.get('/', taskTemplateController.getTaskTemplates);
router.get('/:id', taskTemplateController.getTaskTemplateById);
router.put('/:id', taskTemplateController.updateTaskTemplate);
router.delete('/:id', taskTemplateController.deleteTaskTemplate);

module.exports = router;
