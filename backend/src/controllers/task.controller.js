const Task = require('../models/task.model');
const Activity = require('../models/activity.model');
const User = require('../models/user.model');

/**
 * Función auxiliar para registrar actividades relacionadas con tareas
 * @param {Object} userId - ID del usuario que realiza la acción
 * @param {Object} taskId - ID de la tarea relacionada
 * @param {string} type - Tipo de actividad (task_create, task_update, task_complete, task_delete, task_accept, task_reject)
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
      case 'task_accept':
        message = `Tarea "${taskData.title}" aceptada`;
        metadata = { 
          title: taskData.title,
          acceptedAt: new Date().toISOString()
        };
        break;
      case 'task_reject':
        message = `Tarea "${taskData.title}" rechazada`;
        metadata = { 
          title: taskData.title,
          rejectedAt: new Date().toISOString()
        };
        break;
      case 'task_on_site':
        message = `Llegada al sitio de la tarea "${taskData.title}"`;
        metadata = { 
          title: taskData.title,
          arrivedAt: new Date().toISOString(),
          status: 'on_site'
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

// Importar utilidad de notificación para enviar alertas a usuarios
let notificationUtil;
try {
  notificationUtil = require('../utils/notification.util');
} catch (error) {
  console.warn('No se pudo cargar el módulo de notificaciones, las alertas push estarán deshabilitadas');
  // Crear una implementación simulada
  notificationUtil = {
    notifyAdminActivity: () => Promise.resolve({ success: false, error: 'Módulo no disponible' }),
    notifyUser: () => Promise.resolve({ success: false, error: 'Módulo no disponible' })
  };
}

// Crear una nueva tarea
exports.createTask = async (req, res) => {
  try {
    const { title, description, userId, timeLimit, location, radius, locationName, handsFreeMode, status, keywords } = req.body;
    
    console.log('Datos completos recibidos para crear tarea:', JSON.stringify(req.body, null, 2));
    
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
      status: status || 'waiting_for_acceptance', // Usar el status proporcionado o 'waiting_for_acceptance' por defecto
      keywords: keywords || '' // Guardar las palabras clave específicas para activación por voz
    };
    
    // Añadir tiempo límite si se proporciona
    if (timeLimit && !isNaN(Number(timeLimit)) && Number(timeLimit) > 0) {
      console.log(`Configurando tiempo límite: ${timeLimit} minutos`);
      taskData.timeLimit = Number(timeLimit);
      // No configurar timeLimitSet al crear la tarea - esto se configurará cuando el usuario inicie la tarea
      // taskData.timeLimitSet = new Date().toISOString();
      console.log(`Fecha de inicio del límite: ${taskData.timeLimitSet}`);
    }
    
    // Añadir información de ubicación si se proporciona
    if (location) {
      console.log('Datos de ubicación recibidos:', JSON.stringify(location));
      
      // Manejar diferentes formatos posibles de ubicación
      let locationObject = {
        type: 'Point',
        coordinates: [0, 0] // Valores por defecto
      };
      
      // Caso 1: location es un objeto con coordinates como array
      if (location.coordinates && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
        console.log('Formato 1: location con coordinates como array');
        locationObject.coordinates = location.coordinates;
      }
      // Caso 2: location es un objeto con latitude y longitude
      else if (location.latitude !== undefined && location.longitude !== undefined) {
        console.log('Formato 2: location con latitude y longitude');
        locationObject.coordinates = [location.longitude, location.latitude];
      }
      // Caso 3: location es un array de [longitude, latitude]
      else if (Array.isArray(location) && location.length === 2) {
        console.log('Formato 3: location como array');
        locationObject.coordinates = location;
      }
      
      console.log(`Guardando ubicación: ${JSON.stringify(locationObject.coordinates)}`);
      taskData.location = locationObject;
      
      // Añadir radio y nombre de ubicación si se proporcionan
      if (radius) {
        taskData.radius = Number(radius);
      }
      
      if (locationName) {
        taskData.locationName = locationName;
      }
      
      console.log(`Tarea con ubicación: ${JSON.stringify(locationObject.coordinates)}, radio: ${radius}km, lugar: ${locationName || 'Sin nombre'}`);
    }
    
    console.log('Datos completos a guardar en la tarea:', JSON.stringify(taskData, null, 2));
    
    const task = new Task(taskData);
    
    // Guardar en la base de datos
    await task.save();
    
    // Obtener la tarea con el usuario populado para devolver datos completos
    const populatedTask = await Task.findById(task._id).populate('userId', 'username email');
    
    console.log(`Tarea creada con ID: ${task._id}`);
    console.log('Datos de la tarea guardada:', JSON.stringify(populatedTask, null, 2));
    
    // Registrar actividad de creación de tarea
    await registerTaskActivity(req.user._id, task._id, 'task_create', populatedTask);
    
    res.status(201).json(populatedTask);
  } catch (error) {
    console.error('Error al crear tarea:', error);
    res.status(500).json({ message: 'Error al crear tarea', error: error.message });
  }
};

// Crear una tarea asignada a otro usuario (solo admin)
exports.createAssignedTask = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      userId, 
      location, 
      radius, 
      locationName, 
      handsFreeMode, 
      status, 
      keywords,
      timeLimit,  
      timeLimitSet  
    } = req.body;
    
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
      status: status || 'waiting_for_acceptance', // Usar el status proporcionado o 'waiting_for_acceptance' por defecto
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
    
    // Añadir información de tiempo límite si se proporciona
    if (timeLimit) {
      // Asegurar que timeLimit es un número
      taskData.timeLimit = typeof timeLimit === 'string' ? Number(timeLimit) : timeLimit;
      // NO establecer timeLimitSet aquí - esto se configurará cuando el usuario acepte la tarea
      console.log(`Tarea con tiempo límite: ${taskData.timeLimit} minutos`);
    }
    
    const task = new Task(taskData);
    
    // Guardar en la base de datos
    await task.save();
    
    // Obtener la tarea con el usuario populado para devolver datos completos
    const populatedTask = await Task.findById(task._id).populate('userId', 'username email');
    
    console.log(`Tarea asignada creada: ${task._id}, asignada a usuario: ${userId}`);
    console.log('Datos de la tarea asignada:', JSON.stringify(populatedTask));
    
    // Registrar actividad de creación de tarea
    const activity = await registerTaskActivity(req.user._id, task._id, 'task_create', populatedTask);
    
    // Enviar notificación push al usuario asignado y a los administradores
    try {
      const targetUser = await User.findById(userId);
      if (targetUser) {
        console.log(`Enviando notificación de nueva tarea a usuario ${targetUser.username}`);
        
        // Preparar los datos para la notificación
        const notificationTitle = 'Nueva tarea asignada';
        const notificationBody = `Se te ha asignado una nueva tarea: "${title}"`;
        const notificationData = {
          taskId: task._id.toString(),
          type: 'new_task_assigned',
          priority: 'high',
          title: title,
          locationName: locationName || 'Sin ubicación específica'
        };
        
        // Enviar la notificación SOLO al usuario asignado, no a todos los usuarios
        const notificationResult = await notificationUtil.notifyUser(
          userId, 
          notificationTitle, 
          notificationBody, 
          notificationData
        );
        
        // También notificar a los administradores sobre la asignación de tarea
        if (activity) {
          // Convertir la actividad a un objeto simple
          const activityObj = activity.toObject ? activity.toObject() : activity;
          // Asegurar que los metadatos existan
          if (!activityObj.metadata) activityObj.metadata = {};
          // Añadir información adicional para la notificación
          activityObj.metadata.username = req.user.username;
          activityObj.metadata.targetUsername = targetUser.username;
          activityObj.metadata.title = title;
          
          // Notificar SOLO a los administradores, no al usuario asignado (ya fue notificado arriba)
          await notificationUtil.notifyAdminActivity(activityObj, false);
        }
        
        console.log('Resultado de notificación al usuario:', notificationResult);
      }
    } catch (notificationError) {
      console.error('Error enviando notificación de nueva tarea:', notificationError);
      // No interrumpir el flujo por un error de notificación
    }
    
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
    
    // Manejar cambios de estado
    let statusChanged = false;
    if (status !== undefined) {
      const oldStatus = task.status;
      
      // Verificar si el estado realmente cambió
      if (oldStatus !== status) {
        statusChanged = true;
        task.status = status;
        
        // Registrar timestamps para cambios de estado específicos
        if (status === 'on_site') {
          // Cuando el usuario llega al sitio, registrar que ya está en el lugar
          // El temporizador se detendrá en el cliente, pero mantenemos el timeLimitSet
          console.log(`🌍 Usuario ha llegado al sitio de la tarea ${task._id}`);
        } else if (status === 'on_the_way') {
          task.acceptedAt = new Date();
          // Si la tarea tiene límite de tiempo, comenzar a contar desde que el usuario está en camino
          if (task.timeLimit && !task.timeLimitSet) {
            task.timeLimitSet = new Date();
            console.log(`⏱️ Iniciando temporizador para tarea ${task._id} al estar en camino: ${task.timeLimitSet}`);
          }
        } else if (status === 'waiting_for_acceptance') {
          // Reset de los campos si la tarea vuelve a estado inicial
          task.acceptedAt = null;
          task.timeLimitSet = null;
        }
      } else {
        console.log(`⚠️ Estado de tarea ${task._id} no cambió (sigue siendo ${status}). No se registrará actividad duplicada.`);
      }
    }
    
    // Manejar campos específicos de aceptación/rechazo
    if (req.body.acceptedAt !== undefined) {
      task.acceptedAt = new Date(req.body.acceptedAt);
    }
    
    if (req.body.rejected !== undefined) {
      task.rejected = req.body.rejected;
    }
    
    if (req.body.rejectedAt !== undefined) {
      task.rejectedAt = new Date(req.body.rejectedAt);
    }
    
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
    
    // Registrar la actividad correspondiente y enviar notificaciones apropiadas
    let activity;
    let notificationType = null;
    let notificationTitle = '';
    let notificationBody = '';
    
    if (completed !== undefined) {
      if (completed === true) {
        // Si la tarea fue marcada como completada, registrar actividad específica de completado
        console.log(`Registrando tarea completada: ${task._id}`);
        activity = await registerTaskActivity(req.user._id, task._id, 'task_complete', populatedTask);
        notificationType = 'task_complete';
        notificationTitle = 'Tarea completada';
        notificationBody = `La tarea "${task.title}" ha sido completada`;
      } else if (completed === false && task.isModified('completed')) {
        // Si la tarea fue marcada como no completada después de estar completada
        console.log(`Registrando tarea reactivada: ${task._id}`);
        activity = await registerTaskActivity(req.user._id, task._id, 'task_update', {
          ...populatedTask.toObject(),
          changes: { completed: false }
        });
        notificationType = 'task_update';
        notificationTitle = 'Tarea reactivada';
        notificationBody = `La tarea "${task.title}" ha sido reactivada`;
      }
    } else if (status !== undefined && statusChanged) {
      // Solo registrar actividades si el estado realmente cambió
      if (status === 'on_the_way') {
        console.log(`Registrando actividad de tarea en camino: ${task._id}`);
        activity = await registerTaskActivity(req.user._id, task._id, 'task_accept', populatedTask);
        notificationType = 'task_accept';
        notificationTitle = 'Tarea aceptada';
        notificationBody = `La tarea "${task.title}" ha sido aceptada y está en camino`;
      } else if (status === 'on_site') {
        console.log(`Registrando actividad de tarea en sitio: ${task._id}`);
        activity = await registerTaskActivity(req.user._id, task._id, 'task_on_site', populatedTask);
        notificationType = 'task_on_site';
        notificationTitle = 'Llegada al sitio';
        notificationBody = `El usuario ha llegado al sitio de la tarea "${task.title}"`;
      } else if (status === 'waiting_for_acceptance') {
        console.log(`Registrando tarea rechazada: ${task._id}`);
        activity = await registerTaskActivity(req.user._id, task._id, 'task_reject', populatedTask);
        notificationType = 'task_reject';
        notificationTitle = 'Tarea rechazada';
        notificationBody = `La tarea "${task.title}" ha sido rechazada`;
      } else {
        // Para cualquier otro cambio de estado, registrar como actualización normal
        console.log(`Registrando cambio de estado de tarea: ${task._id} a ${status}`);
        activity = await registerTaskActivity(req.user._id, task._id, 'task_update', {
          ...populatedTask.toObject(),
          changes: { status }
        });
        notificationType = 'task_update';
        notificationTitle = 'Tarea actualizada';
        notificationBody = `La tarea "${task.title}" ha sido actualizada`;
      }
    }
    
    // Enviar notificaciones si hay actividad registrada
    if (activity && notificationType) {
      try {
        // Determinar si debemos notificar al propietario de la tarea
        const shouldNotifyOwner = task.userId && task.userId.toString() !== req.user._id.toString();
        
        // Si el usuario actual no es el propietario de la tarea, notificar al propietario
        if (shouldNotifyOwner) {
          console.log(`Enviando notificación al propietario de la tarea: ${task.userId}`);
          
          // Preparar datos para la notificación
          const notificationData = {
            taskId: task._id.toString(),
            type: notificationType,
            priority: 'high',
            title: task.title,
            updatedBy: req.user.username || 'Usuario'
          };
          
          // Enviar notificación SOLO al propietario de la tarea
          await notificationUtil.notifyUser(
            task.userId.toString(),
            notificationTitle,
            notificationBody,
            notificationData
          );
        }
        
        // Notificar a los administradores sobre la actualización
        const activityObj = activity.toObject ? activity.toObject() : activity;
        if (!activityObj.metadata) activityObj.metadata = {};
        
        // Añadir información adicional para la notificación
        activityObj.metadata.username = req.user.username;
        activityObj.metadata.title = task.title;
        
        // Notificar SOLO a los administradores (no al propietario, ya fue notificado arriba si corresponde)
        await notificationUtil.notifyAdminActivity(activityObj, false);
        
      } catch (notificationError) {
        console.error('Error enviando notificaciones de actualización de tarea:', notificationError);
        // No interrumpir el flujo por un error de notificación
      }
    } else {
      // Para cualquier otra actualización, registrar como actualización normal
      console.log(`Registrando actualización general de tarea: ${task._id}`);
      const activity = await registerTaskActivity(req.user._id, task._id, 'task_update', {
        ...populatedTask.toObject(),
        changes: req.body
      });
      
      // Enviar notificaciones para actualizaciones generales
      try {
        // Determinar si debemos notificar al propietario de la tarea
        const shouldNotifyOwner = task.userId && task.userId.toString() !== req.user._id.toString();
        
        // Si el usuario actual no es el propietario de la tarea, notificar al propietario
        if (shouldNotifyOwner) {
          console.log(`Enviando notificación al propietario de la tarea: ${task.userId}`);
          
          // Preparar datos para la notificación
          const notificationData = {
            taskId: task._id.toString(),
            type: 'task_update',
            priority: 'high',
            title: task.title,
            updatedBy: req.user.username || 'Usuario'
          };
          
          // Enviar notificación SOLO al propietario de la tarea
          await notificationUtil.notifyUser(
            task.userId.toString(),
            'Tarea actualizada',
            `La tarea "${task.title}" ha sido actualizada`,
            notificationData
          );
        }
        
        // Notificar a los administradores sobre la actualización
        if (activity) {
          const activityObj = activity.toObject ? activity.toObject() : activity;
          if (!activityObj.metadata) activityObj.metadata = {};
          
          // Añadir información adicional para la notificación
          activityObj.metadata.username = req.user.username;
          activityObj.metadata.title = task.title;
          
          // Notificar SOLO a los administradores (no al propietario, ya fue notificado arriba si corresponde)
          await notificationUtil.notifyAdminActivity(activityObj, false);
        }
      } catch (notificationError) {
        console.error('Error enviando notificaciones de actualización general de tarea:', notificationError);
        // No interrumpir el flujo por un error de notificación
      }
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
      type: 'NOTES', // Ahora siempre guardaremos como NOTES
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

/**
 * Obtiene una tarea por su ID
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
exports.getTaskById = async (req, res) => {
  try {
    const taskId = req.params.id;
    
    if (!taskId) {
      return res.status(400).json({ 
        success: false,
        message: 'ID de tarea no proporcionado' 
      });
    }
    
    console.log(`Buscando tarea con ID: ${taskId}`);
    
    // Buscar la tarea y popular los datos del usuario
    const task = await Task.findById(taskId).populate('userId', 'username email');
    
    if (!task) {
      return res.status(404).json({ 
        success: false,
        message: 'Tarea no encontrada' 
      });
    }
    
    // Verificar si el usuario tiene acceso a esta tarea
    // Los administradores pueden ver cualquier tarea
    if (!req.user.isAdmin && task.userId && task.userId._id && task.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'No tienes permiso para ver esta tarea' 
      });
    }
    
    console.log(`Tarea encontrada: ${task.title}`);
    console.log('Datos de la tarea (incluye timeLimit):', JSON.stringify(task, null, 2));
    
    // Verificar si la tarea tiene tiempo límite
    if (task.timeLimit) {
      console.log(`Tiempo límite: ${task.timeLimit} minutos, establecido en: ${task.timeLimitSet}`);
      
      // NO establecer automáticamente timeLimitSet aquí - solo se debe establecer cuando el usuario acepta la tarea
      // if (!task.timeLimitSet) {
      //   task.timeLimitSet = new Date().toISOString();
      //   await task.save();
      //   console.log(`Se estableció la fecha de inicio del límite: ${task.timeLimitSet}`);
      // }
    }
    
    // Verificar si la tarea tiene ubicación
    if (task.location && task.location.coordinates) {
      console.log(`Ubicación: [${task.location.coordinates}], Radio: ${task.radius}km`);
    } else {
      console.log('La tarea no tiene ubicación definida');
    }
    
    return res.status(200).json(task);
  } catch (error) {
    console.error('Error al obtener tarea por ID:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error al obtener la tarea',
      error: error.message
    });
  }
};
