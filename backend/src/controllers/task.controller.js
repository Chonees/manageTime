const Task = require('../models/task.model');
const Activity = require('../models/activity.model');

/**
 * Función auxiliar para registrar actividades relacionadas con tareas
 * @param {Object} userId - ID del usuario que realiza la acción
 * @param {Object} taskId - ID de la tarea relacionada
 * @param {string} type - Tipo de actividad (task_create, task_update, task_complete, task_delete)
 * @param {Object} taskData - Datos de la tarea para construir el mensaje
 */
const registerTaskActivity = async (userId, taskId, type, taskData) => {
  try {
    let message = '';
    let metadata = {};
    
    // Construir mensaje según el tipo de actividad
    switch (type) {
      case 'task_create':
        message = `Tarea "${taskData.title}" creada`;
        metadata = { 
          title: taskData.title,
          description: taskData.description || '',
          location: taskData.location || null
        };
        break;
      case 'task_update':
        message = `Tarea "${taskData.title}" actualizada`;
        metadata = { 
          changes: taskData.changes || {},
          title: taskData.title
        };
        break;
      case 'task_complete':
        message = `Tarea "${taskData.title}" completada`;
        metadata = { 
          title: taskData.title,
          completedAt: new Date().toISOString()
        };
        break;
      case 'task_delete':
        message = `Tarea "${taskData.title}" eliminada`;
        metadata = { 
          title: taskData.title,
          deletedAt: new Date().toISOString()
        };
        break;
      default:
        message = `Acción realizada en tarea "${taskData.title}"`;
    }
    
    // Crear el objeto de actividad
    const activity = new Activity({
      userId,
      taskId,
      type,
      message,
      metadata
    });
    
    // Guardar la actividad
    await activity.save();
    console.log(`Actividad registrada: ${type} para tarea ${taskId}`);
    
    return activity;
  } catch (error) {
    console.error('Error al registrar actividad de tarea:', error);
    // No lanzamos el error para que no afecte a la operación principal
    return null;
  }
};

// Crear una nueva tarea
exports.createTask = async (req, res) => {
  try {
    const { title, description, userId, location, radius, locationName, handsFreeMode, status } = req.body;
    
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
    const taskData = {
      title,
      description,
      userId: assignedUserId,
      completed: false,
      handsFreeMode: handsFreeMode === true, // Asegurar que se guarde como booleano
      status: status || 'pending' // Usar el status proporcionado o 'pending' por defecto
    };
    
    // Añadir información de ubicación si se proporciona
    if (location && location.coordinates && location.coordinates.length === 2) {
      taskData.location = {
        type: 'Point',
        coordinates: location.coordinates
      };
      
      // Añadir radio y nombre de ubicación si se proporcionan
      if (radius) {
        taskData.radius = radius;
      }
      
      if (locationName) {
        taskData.locationName = locationName;
      }
      
      console.log(`Tarea con ubicación: ${location.coordinates}, radio: ${radius}km, lugar: ${locationName || 'Sin nombre'}`);
    }
    
    const task = new Task(taskData);
    
    // Guardar en la base de datos
    await task.save();
    
    // Obtener la tarea con el usuario populado para devolver datos completos
    const populatedTask = await Task.findById(task._id).populate('userId', 'username email');
    
    console.log(`Tarea creada: ${task._id}, asignada a usuario: ${assignedUserId}`);
    console.log('Datos de la tarea creada:', JSON.stringify(populatedTask));
    
    // Registrar actividad de creación de tarea
    await registerTaskActivity(req.user._id, task._id, 'task_create', populatedTask);
    
    res.status(201).json(populatedTask);
  } catch (error) {
    console.error('Error al crear tarea:', error);
    res.status(500).json({ message: 'Error al crear tarea' });
  }
};

// Crear una tarea asignada a otro usuario (solo admin)
exports.createAssignedTask = async (req, res) => {
  try {
    const { title, description, userId, location, radius, locationName, handsFreeMode, status } = req.body;
    
    console.log('Admin creando tarea asignada con datos:', req.body);
    
    if (!title) {
      return res.status(400).json({ message: 'El título de la tarea es requerido' });
    }
    
    if (!userId) {
      return res.status(400).json({ message: 'El ID del usuario asignado es requerido' });
    }
    
    console.log(`Admin ${req.user.username} asignando tarea a usuario con ID: ${userId}`);
    
    // Crear nueva tarea explícitamente asignada al usuario especificado
    const taskData = {
      title,
      description,
      userId: userId,
      completed: false,
      handsFreeMode: handsFreeMode === true, // Asegurar que se guarde como booleano
      status: status || 'pending' // Usar el status proporcionado o 'pending' por defecto
    };
    
    // Añadir información de ubicación si se proporciona
    if (location && location.coordinates && location.coordinates.length === 2) {
      taskData.location = {
        type: 'Point',
        coordinates: location.coordinates
      };
      
      // Añadir radio y nombre de ubicación si se proporcionan
      if (radius) {
        taskData.radius = radius;
      }
      
      if (locationName) {
        taskData.locationName = locationName;
      }
      
      console.log(`Tarea con ubicación: ${location.coordinates}, radio: ${radius}km, lugar: ${locationName || 'Sin nombre'}`);
    }
    
    const task = new Task(taskData);
    
    // Guardar en la base de datos
    await task.save();
    
    // Obtener la tarea con el usuario populado para devolver datos completos
    const populatedTask = await Task.findById(task._id).populate('userId', 'username email');
    
    console.log(`Tarea asignada creada: ${task._id}, asignada a usuario: ${userId}`);
    console.log('Datos de la tarea asignada:', JSON.stringify(populatedTask));
    
    // Registrar actividad de creación de tarea
    await registerTaskActivity(req.user._id, task._id, 'task_create', populatedTask);
    
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

// Obtener tareas por cercanía a una ubicación
exports.getNearbyTasks = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 10000 } = req.query; // maxDistance en metros (10km por defecto)
    
    if (!longitude || !latitude) {
      return res.status(400).json({ message: 'Coordenadas de ubicación requeridas' });
    }
    
    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);
    const distance = parseInt(maxDistance);
    
    console.log(`Buscando tareas cerca de [${lng}, ${lat}] en un radio de ${distance}m`);
    
    // Consulta geoespacial para encontrar tareas cerca de la ubicación proporcionada
    const tasks = await Task.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: distance // distancia en metros
        }
      }
    }).populate('userId', 'username email');
    
    console.log(`Se encontraron ${tasks.length} tareas dentro del radio especificado`);
    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error al obtener tareas cercanas:', error);
    res.status(500).json({ message: 'Error al obtener tareas cercanas' });
  }
};

// Actualizar una tarea
exports.updateTask = async (req, res) => {
  try {
    const { title, description, completed, location, radius, locationName, handsFreeMode, status } = req.body;
    
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
    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (completed !== undefined) task.completed = completed;
    if (handsFreeMode !== undefined) task.handsFreeMode = handsFreeMode === true; // Asegurar que se guarde como booleano
    if (status !== undefined) task.status = status;
    
    // Actualizar información de ubicación si se proporciona
    if (location && location.coordinates && location.coordinates.length === 2) {
      task.location = {
        type: 'Point',
        coordinates: location.coordinates
      };
      
      // Actualizar radio y nombre de ubicación si se proporcionan
      if (radius !== undefined) {
        task.radius = radius;
      }
      
      if (locationName !== undefined) {
        task.locationName = locationName;
      }
      
      console.log(`Tarea actualizada con ubicación: ${location.coordinates}, radio: ${radius}km, lugar: ${locationName || 'Sin nombre'}`);
    }
    
    // Guardar cambios
    await task.save();
    
    // Obtener la tarea con el usuario populado para devolver datos completos
    const populatedTask = await Task.findById(task._id).populate('userId', 'username email');
    
    console.log(`Tarea actualizada: ${task._id}`);
    console.log('Datos de la tarea actualizada:', JSON.stringify(populatedTask));
    
    // Registrar la actividad correspondiente
    if (completed !== undefined) {
      if (completed === true) {
        // Si la tarea fue marcada como completada, registrar actividad específica de completado
        console.log(`Registrando tarea completada: ${task._id}`);
        await registerTaskActivity(req.user._id, task._id, 'task_complete', populatedTask);
      } else if (completed === false && task.isModified('completed')) {
        // Si la tarea fue marcada como no completada después de estar completada
        console.log(`Registrando tarea reactivada: ${task._id}`);
        await registerTaskActivity(req.user._id, task._id, 'task_update', {
          ...populatedTask.toObject(),
          changes: { completed: false }
        });
      }
    } else {
      // Para cualquier otra actualización, registrar como actualización normal
      console.log(`Registrando actualización general de tarea: ${task._id}`);
      await registerTaskActivity(req.user._id, task._id, 'task_update', populatedTask);
    }
    
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
    
    // Registrar actividad de eliminación de tarea
    await registerTaskActivity(req.user._id, req.params.id, 'task_delete', { title: task.title });
    
    res.status(200).json({ message: 'Tarea eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    res.status(500).json({ message: 'Error al eliminar tarea' });
  }
};

/**
 * Obtiene la tarea activa actual del usuario con modo manos libres
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
exports.getActiveTask = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Buscar la tarea más reciente que esté en progreso para este usuario
    const activeTask = await Task.findOne({
      assignedTo: userId,
      status: 'in_progress',
      handsFreeMode: true // Solo tareas que tengan el modo manos libres
    }).sort({ startedAt: -1 });
    
    if (!activeTask) {
      return res.status(404).json({ message: 'No hay tareas activas con modo manos libres' });
    }
    
    res.status(200).json(activeTask);
  } catch (error) {
    console.error('Error al obtener tarea activa:', error);
    res.status(500).json({ message: 'Error al obtener la tarea activa' });
  }
};

/**
 * Registra una nota de voz para una tarea
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
exports.addTaskNote = async (req, res) => {
  try {
    const { taskId, text, type } = req.body;
    const userId = req.user.id;
    
    // Verificar que la tarea exista y esté asignada al usuario
    const task = await Task.findOne({ 
      _id: taskId, 
      assignedTo: userId
    });
    
    if (!task) {
      return res.status(404).json({ 
        message: 'Tarea no encontrada o no asignada a este usuario' 
      });
    }
    
    // Crear actividad para la nota de voz
    const activity = new Activity({
      userId,
      taskId,
      type: type || 'voice_note',
      text,
      createdAt: new Date()
    });
    
    await activity.save();
    
    res.status(201).json({
      message: 'Nota registrada correctamente',
      activity
    });
  } catch (error) {
    console.error('Error al registrar nota:', error);
    res.status(500).json({ message: 'Error al registrar la nota' });
  }
};
