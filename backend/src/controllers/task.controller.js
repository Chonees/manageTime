const Task = require('../models/task.model');
const User = require('../models/user.model');
const Activity = require('../models/activity.model');
const mongoose = require('mongoose');

// Obtener tareas del usuario actual
exports.getMyTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Buscar tareas asignadas al usuario que no están completadas primero
    const tasks = await Task.find({ 
      userId: userId
    }).sort({ 
      completed: 1, // Primero las no completadas
      updatedAt: -1 // Más recientes primero
    });
    
    return res.status(200).json(tasks);
  } catch (error) {
    console.error('Error al obtener tareas del usuario:', error);
    return res.status(500).json({ 
      message: 'Error al obtener tareas del usuario', 
      error: error.message 
    });
  }
};