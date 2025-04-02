const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Rutas para administradores
router.get('/', isAdmin, userController.getAllUsers);
router.delete('/:id', isAdmin, userController.deleteUser);

// Rutas para usuarios autenticados
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.put('/:id/change-password', userController.changePassword);

module.exports = router;
