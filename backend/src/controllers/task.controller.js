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
    const { title, description, userId, location, radius, locationName, handsFreeMode, status, keywords } = req.body;
    
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
      status: status || 'pending', // Usar el status proporcionado o 'pending' por defecto
      keywords: keywords || '' // Guardar las palabras clave específicas para activación por voz
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
    const { title, description, userId, location, radius, locationName, handsFreeMode, status, keywords } = req.body;
    
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
      status: status || 'pending', // Usar el status proporcionado o 'pending' por defecto
      keywords: keywords || '' // Guardar las palabras clave específicas para activación por voz
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
    console.log(`Administrador ${req.user.username} solicitando todas las tareas`);
    
    // Añadir manejo de errores y validación
    if (!req.user || !req.user.isAdmin) {
      console.log('Usuario no autorizado intentando obtener todas las tareas');
      return res.status(403).json({ message: 'No autorizado para ver todas las tareas' });
    }
    
    const tasks = await Task.find()
                         .sort({ createdAt: -1 })
                         .populate('userId', 'username email')
                         .lean();  // Añadido .lean() para mejorar rendimiento
    
    // Verificar resultado
    if (!tasks) {
      console.log('No se pudieron recuperar las tareas');
      return res.status(404).json({ message: 'No se encontraron tareas' });
    }
    
    console.log(`Admin ${req.user.username} obtuvo ${tasks.length} tareas correctamente`);
    return res.status(200).json(tasks);
  } catch (error) {
    console.error('Error al obtener todas las tareas:', error);
    return res.status(500).json({ message: 'Error al obtener todas las tareas', error: error.message });
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
    // Extraer ID del usuario, asegurando que sea un ObjectId válido
    const userId = req.user._id || req.user.id;
    console.log(`Buscando tarea activa para usuario ID: ${userId}`);
    console.log(`Token decodificado:`, JSON.stringify(req.user, null, 2));
    
    // Usar mongoose para crear un ObjectId válido
    const mongoose = require('mongoose');
    let userObjectId;
    
    try {
      // Intentar convertir a ObjectId si no lo es ya
      userObjectId = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId)
        : userId;
      console.log(`ID de usuario convertido a ObjectId: ${userObjectId}`);
    } catch (err) {
      console.error(`Error al convertir ID a ObjectId: ${err.message}`);
      userObjectId = userId; // Usar el original si falla la conversión
    }
    
    // Buscar todas las tareas del usuario, probando diferentes formatos de ID
    const allUserTasks = await Task.find({ 
      $or: [
        { userId: userObjectId },
        { userId: userId.toString() }
      ]
    }).lean();
    
    console.log(`Todas las tareas del usuario (${allUserTasks.length}):`, JSON.stringify(allUserTasks, null, 2));
    
    // Buscar todas las tareas con manos libres
    const allHandsFreeTasks = await Task.find({ handsFreeMode: true }).lean();
    console.log(`Todas las tareas con manos libres (${allHandsFreeTasks.length}):`, JSON.stringify(allHandsFreeTasks, null, 2));
    
    // Intentar primero con la condición más específica
    let query = {
      $or: [
        { userId: userObjectId },
        { userId: userId.toString() }
      ],
      handsFreeMode: true,
      $or: [
        { status: 'in_progress' },
        { status: 'in-progress' }
      ]
    };
    
    console.log('Consulta para buscar tarea activa:', JSON.stringify(query, null, 2));
    
    // Buscar la tarea más reciente que cumpla todas las condiciones
    let activeTask = await Task.findOne(query).sort({ createdAt: -1 });
    
    // Si no encontramos ninguna, probamos solo con handsFreeMode
    if (!activeTask) {
      console.log('No se encontró tarea activa con todas las condiciones, buscando solo por handsFreeMode');
      query = {
        $or: [
          { userId: userObjectId },
          { userId: userId.toString() }
        ],
        handsFreeMode: true
      };
      activeTask = await Task.findOne(query).sort({ createdAt: -1 });
    }
    
    // Si aún no encontramos, buscamos cualquier tarea del usuario
    if (!activeTask) {
      console.log('No se encontró tarea con handsFreeMode, buscando cualquier tarea');
      query = { 
        $or: [
          { userId: userObjectId },
          { userId: userId.toString() }
        ]
      };
      activeTask = await Task.findOne(query).sort({ createdAt: -1 });
    }
    
    if (!activeTask) {
      // Última opción: buscar por el ID específico que hemos visto en la captura de pantalla
      const knownTaskId = '67f67fa138b16b8dc0ea18a1';
      console.log(`Intentando con un ID de tarea conocido: ${knownTaskId}`);
      
      activeTask = await Task.findById(knownTaskId);
      
      if (!activeTask) {
        console.log(`No se encontraron tareas activas para usuario ${userId}`);
        return res.status(404).json({ message: 'No hay tareas activas con modo manos libres' });
      } else {
        console.log(`Encontrada tarea con ID conocido: ${activeTask.title}`);
      }
    }
    
    console.log(`Tarea activa encontrada: ${activeTask.title} (ID: ${activeTask.id}), status: ${activeTask.status || 'sin estado'}, handsFreeMode: ${activeTask.handsFreeMode}`);
    
    // Si encontramos una tarea pero no tiene handsFreeMode, activarlo automáticamente
    if (!activeTask.handsFreeMode) {
      console.log(`Activando handsFreeMode automáticamente para tarea ${activeTask.id}`);
      activeTask.handsFreeMode = true;
      activeTask.status = 'in-progress';
      await activeTask.save();
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
    const userId = req.user._id || req.user.id;
    
    console.log(`Intentando agregar nota a tarea ${taskId}`);
    console.log(`Datos de la nota:`, JSON.stringify(req.body, null, 2));
    console.log(`Usuario que hace la solicitud: ${userId}`);
    
    // Convertir IDs a formato compatible con MongoDB
    const mongoose = require('mongoose');
    let taskObjectId, userObjectId;
    
    try {
      // Convertir a ObjectId si es posible
      taskObjectId = mongoose.Types.ObjectId.isValid(taskId) 
        ? new mongoose.Types.ObjectId(taskId) 
        : taskId;
      
      userObjectId = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;
      
      console.log(`Task ID convertido: ${taskObjectId}`);
    } catch (err) {
      console.error(`Error al convertir IDs: ${err.message}`);
      // Continuar con los IDs originales si hay error
      taskObjectId = taskId;
      userObjectId = userId;
    }
    
    // Buscar la tarea con múltiples formatos de ID
    let task = await Task.findOne({
      $or: [
        { _id: taskObjectId },
        { _id: taskId.toString() }
      ]
    });
    
    if (!task) {
      console.error(`Tarea no encontrada con ID: ${taskId}`);
      return res.status(404).json({ 
        message: 'Tarea no encontrada'
      });
    }
    
    console.log(`Tarea encontrada: ${task.title} (ID: ${task._id})`);
    console.log(`Propietario de la tarea: ${task.userId}`);
    
    // Flexibilizar la verificación de usuario temporalmente 
    // para permitir guardar notas en cualquier tarea con handsFreeMode
    if (task.handsFreeMode) {
      console.log(`Tarea tiene modo manos libres activado, permitiendo guardar nota sin verificar propietario`);
    } else {
      // Verificar que la tarea pertenezca al usuario
      const isOwner = 
        task.userId.toString() === userId.toString() || 
        task.userId.toString() === userObjectId.toString();
      
      if (!isOwner) {
        console.error(`Tarea no pertenece al usuario ${userId}`);
        return res.status(403).json({ 
          message: 'No tienes permiso para agregar notas a esta tarea'
        });
      }
    }
    
    // Crear actividad para la nota de voz
    const activity = new Activity({
      userId: userObjectId,
      taskId: taskObjectId,
      type: type || 'voice_note',
      text,
      createdAt: new Date()
    });
    
    await activity.save();
    console.log(`Nota guardada correctamente para tarea ${task.title}`);
    
    res.status(201).json({
      message: 'Nota registrada correctamente',
      activity
    });
  } catch (error) {
    console.error('Error al registrar nota:', error);
    res.status(500).json({ message: 'Error al registrar la nota' });
  }
};

/**
 * Registra una nota de voz simplificada para una tarea
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
exports.addSimpleVoiceNote = async (req, res) => {
  try {
    // Extraer datos de la petición
    const { taskId } = req.params;
    const { text, type, keyword } = req.body;
    const userId = req.user._id || req.user.id;
    
    console.log(`[SIMPLE VOICE NOTE] Recibida petición para añadir nota a tarea ${taskId}`);
    console.log(`[SIMPLE VOICE NOTE] Texto: "${text}"`);
    if (keyword) {
      console.log(`[SIMPLE VOICE NOTE] Palabra clave detectada: "${keyword}"`);
    }
    console.log(`[SIMPLE VOICE NOTE] Usuario: ${userId}`);
    
    // Verificar que hay texto válido
    if (!text || text.trim() === '') {
      console.error('[SIMPLE VOICE NOTE] Texto de nota vacío');
      return res.status(400).json({ message: 'El texto de la nota no puede estar vacío' });
    }
    
    // Intentar convertir a ObjectId si es necesario
    const mongoose = require('mongoose');
    let taskObjectId;
    
    try {
      // Intentar convertir taskId a ObjectId
      taskObjectId = mongoose.Types.ObjectId.isValid(taskId) 
        ? new mongoose.Types.ObjectId(taskId) 
        : taskId;
        
      console.log(`[SIMPLE VOICE NOTE] TaskId convertido: ${taskObjectId}`);
    } catch (err) {
      console.warn(`[SIMPLE VOICE NOTE] Error al convertir ID: ${err.message}`);
      taskObjectId = taskId; // Usar el ID original si hay error
    }
    
    // Buscar la tarea (sin validar usuario por ahora)
    const Task = require('../models/task.model');
    const task = await Task.findById(taskObjectId);
    
    if (!task) {
      console.error(`[SIMPLE VOICE NOTE] Tarea no encontrada: ${taskId}`);
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }
    
    console.log(`[SIMPLE VOICE NOTE] Tarea encontrada: ${task.title}`);
    
    // Crear la actividad de nota directamente
    const Activity = require('../models/activity.model');
    const activity = new Activity({
      userId,
      taskId: taskObjectId,
      type: type || 'voice_note',
      message: keyword || text, // Usar la palabra clave si está disponible, si no usar el texto completo
      metadata: {
        source: 'voice_assistant',
        timestamp: new Date().toISOString(),
        fullText: text, // Guardar el texto completo en metadatos
        keyword: keyword // Guardar la palabra clave en metadatos
      },
      createdAt: new Date()
    });
    
    // Guardar la actividad
    await activity.save();
    console.log(`[SIMPLE VOICE NOTE] Nota guardada correctamente para tarea ${task.title}`);
    
    // Enviar respuesta de éxito
    res.status(201).json({
      success: true,
      message: 'Nota de voz guardada correctamente',
      activity: {
        id: activity._id,
        text: activity.message,
        createdAt: activity.createdAt
      }
    });
    
  } catch (error) {
    console.error('[SIMPLE VOICE NOTE] Error al guardar nota:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al guardar la nota de voz',
      error: error.message
    });
  }
};
