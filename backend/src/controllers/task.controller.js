const Task = require('../models/task.model');

// Crear una nueva tarea
exports.createTask = async (req, res) => {
  try {
    const { title, description, userId } = req.body;
    
    console.log('Datos recibidos para crear tarea:', req.body);
    
    if (!title) {
      return res.status(400).json({ message: 'El título de la tarea es requerido' });
    }
    
    // Determinar a qué usuario asignar la tarea
    let assignedUserId = req.user._id;
    
    // Si es admin y se proporciona un userId, asignar la tarea a ese usuario
    if (req.user.isAdmin && userId) {
      console.log(`Admin ${req.user.username} asignando tarea a usuario con ID: ${userId}`);
      assignedUserId = userId;
    } else {
      console.log(`Tarea asignada al usuario actual: ${req.user.username} (${req.user._id})`);
    }
    
    // Crear nueva tarea
    const task = new Task({
      title,
      description,
      userId: assignedUserId,
      completed: false
    });
    
    // Guardar en la base de datos
    await task.save();
    
    // Obtener la tarea con el usuario populado para devolver datos completos
    const populatedTask = await Task.findById(task._id).populate('userId', 'username email');
    
    console.log(`Tarea creada: ${task._id}, asignada a usuario: ${assignedUserId}`);
    console.log('Datos de la tarea creada:', JSON.stringify(populatedTask));
    
    res.status(201).json(populatedTask);
  } catch (error) {
    console.error('Error al crear tarea:', error);
    res.status(500).json({ message: 'Error al crear tarea' });
  }
};

// Crear una tarea asignada a otro usuario (solo admin)
exports.createAssignedTask = async (req, res) => {
  try {
    const { title, description, userId } = req.body;
    
    console.log('Admin creando tarea asignada con datos:', req.body);
    
    if (!title) {
      return res.status(400).json({ message: 'El título de la tarea es requerido' });
    }
    
    if (!userId) {
      return res.status(400).json({ message: 'El ID del usuario asignado es requerido' });
    }
    
    console.log(`Admin ${req.user.username} asignando tarea a usuario con ID: ${userId}`);
    
    // Crear nueva tarea explícitamente asignada al usuario especificado
    const task = new Task({
      title,
      description,
      userId: userId,
      completed: false
    });
    
    // Guardar en la base de datos
    await task.save();
    
    // Obtener la tarea con el usuario populado para devolver datos completos
    const populatedTask = await Task.findById(task._id).populate('userId', 'username email');
    
    console.log(`Tarea asignada creada: ${task._id}, asignada a usuario: ${userId}`);
    console.log('Datos de la tarea asignada:', JSON.stringify(populatedTask));
    
    res.status(201).json(populatedTask);
  } catch (error) {
    console.error('Error al crear tarea asignada:', error);
    res.status(500).json({ message: 'Error al crear tarea asignada' });
  }
};

// Obtener todas las tareas del usuario actual
exports.getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user._id })
                           .sort({ createdAt: -1 })
                           .populate('userId', 'username email');
    
    console.log(`Se encontraron ${tasks.length} tareas para el usuario ${req.user.username}`);
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
    
    console.log(`Admin ${req.user.username} obtuvo ${tasks.length} tareas`);
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
    
    // Obtener la tarea con el usuario populado para devolver datos completos
    const populatedTask = await Task.findById(task._id).populate('userId', 'username email');
    
    console.log(`Tarea actualizada: ${task._id}`);
    console.log('Datos de la tarea actualizada:', JSON.stringify(populatedTask));
    
    res.status(200).json(populatedTask);
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
    
    console.log(`Tarea eliminada: ${req.params.id}`);
    res.status(200).json({ message: 'Tarea eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    res.status(500).json({ message: 'Error al eliminar tarea' });
  }
};
