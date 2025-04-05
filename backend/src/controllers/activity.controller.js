const Activity = require('../models/activity.model');
const User = require('../models/user.model');
const Task = require('../models/task.model');

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
    const validTypes = ['location_enter', 'location_exit', 'task_complete', 'task_create', 'task_update', 'task_delete'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Tipo de actividad no válido' });
    }

    // Si se proporciona un taskId, verificar que exista y pertenezca al usuario
    if (taskId) {
      const task = await Task.findOne({ _id: taskId, userId });
      if (!task) {
        return res.status(404).json({ message: 'Tarea no encontrada o no pertenece al usuario' });
      }
    }

    // Crear la actividad
    const activity = new Activity({
      userId,
      taskId: taskId || null,
      type,
      message,
      metadata: metadata || {}
    });

    // Guardar la actividad
    await activity.save();

    // Responder con la actividad creada
    res.status(201).json(activity);
  } catch (error) {
    console.error('Error al crear actividad:', error);
    res.status(500).json({ message: 'Error al crear actividad', error: error.message });
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
