const Activity = require('../models/activity.model');
const User = require('../models/user.model');
const Task = require('../models/task.model');
const notificationUtil = require('../utils/notification.util');

/**
 * Crear una nueva actividad
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
exports.createActivity = async (req, res) => {
  try {
    const { type, taskId, message, metadata } = req.body;
    const userId = req.user.id;

    // Validar el tipo de actividad
    const validTypes = [
      'location_enter', 'location_exit', 
      'task_complete', 'task_create', 'task_update', 'task_delete',
      'started_working', 'stopped_working', 'clock_in', 'clock_out', 'task_activity'
    ];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Tipo de actividad no válido' });
    }

    // Si se proporciona un taskId, verificar que exista
    if (taskId) {
      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({ message: 'Tarea no encontrada' });
      }
    }

    // Obtener el usuario para incluir su nombre en la actividad
    const user = await User.findById(userId);
    const username = user ? user.username : 'Usuario';

    // Crear la actividad
    const activity = new Activity({
      userId,
      username,
      taskId: taskId || null,
      type,
      message: message || '',
      metadata: metadata || {},
      timestamp: new Date()
    });

    // Guardar la actividad
    await activity.save();
    
    // Enviar notificación push a administradores según el tipo de actividad
    try {
      if (['clock_in', 'clock_out', 'started_working', 'stopped_working', 'task_complete', 'location_enter', 'location_exit'].includes(type)) {
        const savedActivity = activity.toObject();
        await notificationUtil.notifyAdminActivity(savedActivity);
        console.log(`Notificación push enviada para actividad ${type}`);
      }
    } catch (notificationError) {
      console.error('Error enviando notificación push:', notificationError);
      // No interrumpimos el flujo si falla la notificación
    }

    // Responder con la actividad creada
    res.status(201).json(activity);
  } catch (error) {
    console.error('Error al crear actividad:', error);
    res.status(500).json({ 
      message: 'Error al crear actividad', 
      error: error.message,
      details: error.stack 
    });
  }
};

/**
 * Obtener todas las actividades del usuario actual
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
exports.getUserActivities = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Obtener actividades paginadas
    const activities = await Activity.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('taskId', 'title description');

    // Contar total de actividades para paginación
    const total = await Activity.countDocuments({ userId });

    res.status(200).json({
      activities,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener actividades:', error);
    res.status(500).json({ message: 'Error al obtener actividades', error: error.message });
  }
};

/**
 * Obtener actividades recientes para el dashboard
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
exports.getRecentActivities = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    // Obtener actividades recientes
    const activities = await Activity.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('taskId', 'title description');

    res.status(200).json(activities);
  } catch (error) {
    console.error('Error al obtener actividades recientes:', error);
    res.status(500).json({ message: 'Error al obtener actividades recientes', error: error.message });
  }
};

/**
 * Eliminar una actividad
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
exports.deleteActivity = async (req, res) => {
  try {
    const { activityId } = req.params;
    const userId = req.user.id;

    // Verificar que la actividad exista y pertenezca al usuario
    const activity = await Activity.findOne({ _id: activityId, userId });
    if (!activity) {
      return res.status(404).json({ message: 'Actividad no encontrada o no pertenece al usuario' });
    }

    // Eliminar la actividad
    await Activity.findByIdAndDelete(activityId);

    res.status(200).json({ message: 'Actividad eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar actividad:', error);
    res.status(500).json({ message: 'Error al eliminar actividad', error: error.message });
  }
};

/**
 * Obtener todas las actividades recientes de todos los usuarios (solo admin)
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
exports.getAllActivities = async (req, res) => {
  try {
    // Verificar que el usuario es administrador
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    // Obtener el total de actividades para la paginación
    const total = await Activity.countDocuments();

    // Obtener actividades recientes de todos los usuarios con datos completos
    const activities = await Activity.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username email')  // Incluir datos del usuario
      .populate('taskId', 'title description locationName');  // Incluir datos de la tarea

    // Devolver actividades con metadatos de paginación
    res.status(200).json({
      activities,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    console.error('Error al obtener todas las actividades:', error);
    res.status(500).json({ message: 'Error al obtener todas las actividades', error: error.message });
  }
};

/**
 * Obtener actividades específicas de una tarea
 * @param {Object} req - Objeto de solicitud con taskId como parámetro
 * @param {Object} res - Objeto de respuesta
 */
exports.getTaskActivities = async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({ message: 'Se requiere el ID de la tarea' });
    }

    // Verificar que la tarea existe
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }

    // Verificar que el usuario tiene acceso a esta tarea
    // Los administradores pueden ver todas las actividades de cualquier tarea
    // Los usuarios normales solo pueden ver actividades de tareas asignadas a ellos
    if (!req.user.isAdmin && String(task.userId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'No tienes permiso para ver estas actividades' });
    }
    
    // Obtener todas las actividades relacionadas con esta tarea
    // Ordenar por fecha de creación en orden descendente (más recientes primero)
    const activities = await Activity.find({ taskId })
      .sort({ createdAt: -1 })
      .populate('userId', 'username');
    
    res.status(200).json(activities);
  } catch (error) {
    console.error('Error al obtener actividades de la tarea:', error);
    res.status(500).json({ 
      message: 'Error al obtener actividades de la tarea', 
      error: error.message 
    });
  }
};
