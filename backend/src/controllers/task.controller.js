const Task = require('../models/task.model');

// Crear una nueva tarea
exports.createTask = async (req, res) => {
  try {
    const { title } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: 'El título de la tarea es requerido' });
    }
    
    // Crear nueva tarea
    const task = new Task({
      title,
      userId: req.user._id,
      completed: false
    });
    
    // Guardar en la base de datos
    await task.save();
    
    res.status(201).json(task);
  } catch (error) {
    console.error('Error al crear tarea:', error);
    res.status(500).json({ message: 'Error al crear tarea' });
  }
};

// Obtener todas las tareas del usuario actual
exports.getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user._id })
                           .sort({ createdAt: -1 });
    
    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    res.status(500).json({ message: 'Error al obtener tareas' });
  }
};

// Obtener todas las tareas (solo admin)
exports.getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.find()
                           .sort({ createdAt: -1 })
                           .populate('userId', 'username email');
    
    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error al obtener todas las tareas:', error);
    res.status(500).json({ message: 'Error al obtener todas las tareas' });
  }
};

// Actualizar una tarea
exports.updateTask = async (req, res) => {
  try {
    const { title, completed } = req.body;
    
    // Buscar la tarea
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }
    
    // Verificar si el usuario tiene permiso para actualizar
    if (!req.user.isAdmin && task.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'No tienes permiso para actualizar esta tarea' 
      });
    }
    
    // Actualizar tarea
    task.title = title || task.title;
    if (completed !== undefined) {
      task.completed = completed;
    }
    
    // Guardar cambios
    await task.save();
    
    res.status(200).json(task);
  } catch (error) {
    console.error('Error al actualizar tarea:', error);
    res.status(500).json({ message: 'Error al actualizar tarea' });
  }
};

// Eliminar una tarea
exports.deleteTask = async (req, res) => {
  try {
    // Buscar la tarea
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }
    
    // Verificar si el usuario tiene permiso para eliminar
    if (!req.user.isAdmin && task.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'No tienes permiso para eliminar esta tarea' 
      });
    }
    
    // Eliminar tarea
    await Task.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ message: 'Tarea eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    res.status(500).json({ message: 'Error al eliminar tarea' });
  }
};
