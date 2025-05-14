const express = require('express');
const router = express.Router();
const taskTemplateController = require('../controllers/taskTemplateController');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// Todas las rutas requieren autenticación y permisos de administrador
router.use(verifyToken);
router.use(isAdmin);

// Rutas para plantillas de tareas
router.post('/', taskTemplateController.createTaskTemplate);
router.get('/', taskTemplateController.getTaskTemplates);
router.get('/:id', taskTemplateController.getTaskTemplateById);
router.put('/:id', taskTemplateController.updateTaskTemplate);
router.delete('/:id', taskTemplateController.deleteTaskTemplate);

module.exports = router;
