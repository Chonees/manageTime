const User = require('../models/user.model');
const Task = require('../models/task.model');
const Location = require('../models/location.model');
const Activity = require('../models/activity.model');

// Obtener estadísticas generales
exports.getStats = async (req, res) => {
  try {
    // Verificar que el usuario es administrador
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    // Obtener conteo de usuarios
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    
    // Obtener conteo de tareas
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ completed: true });
    
    // Obtener conteo de registros de ubicación
    const totalLocations = await Location.countDocuments();
    
    // Calcular estadísticas adicionales
    const pendingTasks = totalTasks - completedTasks;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    res.status(200).json({
      users: {
        total: totalUsers,
        active: activeUsers
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        pending: pendingTasks,
        completionRate: completionRate
      },
      locations: {
        total: totalLocations
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
};

// Obtener actividad reciente
exports.getRecentActivity = async (req, res) => {
  try {
    // Verificar que el usuario es administrador
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    // Obtener las últimas tareas creadas o completadas
    const recentTasks = await Task.find()
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('userId', 'username');
    
    // Obtener los últimos registros de ubicación
    const recentLocations = await Location.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('userId', 'username');
    
    // Obtener las últimas actividades del nuevo sistema
    const recentActivitiesFromDb = await Activity.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'username')
      .populate('taskId', 'title');
      
    // Combinar y ordenar por fecha
    const activities = [
      ...recentTasks.map(task => ({
        type: 'task',
        action: task.completed ? 'completed' : 'created',
        username: task.userId ? task.userId.username : 'Usuario desconocido',
        title: task.title,
        timestamp: task.updatedAt,
        id: task._id.toString()
      })),
      ...recentLocations.map(location => ({
        type: 'location',
        action: location.type === 'start' ? 'started_working' : 'stopped_working',
        username: location.userId ? location.userId.username : 'Usuario desconocido',
        coordinates: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        timestamp: location.timestamp,
        id: location._id.toString()
      })),
      // Agregar actividades del nuevo sistema
      ...recentActivitiesFromDb.map(activity => {
        // Mapear tipo de actividad a acción
        let action = 'updated';
        if (activity.type === 'task_create') action = 'created';
        if (activity.type === 'task_complete') action = 'completed';
        if (activity.type === 'task_delete') action = 'deleted';
        if (activity.type === 'location_enter') action = 'entered_location';
        if (activity.type === 'location_exit') action = 'exited_location';
        
        return {
          type: activity.type.startsWith('task_') ? 'task' : 'location',
          action,
          username: activity.userId ? activity.userId.username : 'Usuario desconocido',
          title: activity.taskId ? activity.taskId.title : (activity.metadata?.title || ''),
          message: activity.message,
          timestamp: activity.createdAt,
          id: activity._id.toString()
        };
      })
    ];
    
    // Ordenar por fecha (más reciente primero)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Limitar a 15 actividades
    const recentActivities = activities.slice(0, 15);
    
    // Registrar la respuesta para depuración
    console.log('Enviando actividades recientes:', JSON.stringify(recentActivities, null, 2));
    
    res.status(200).json(recentActivities);
  } catch (error) {
    console.error('Error al obtener actividad reciente:', error);
    res.status(500).json({ message: 'Error al obtener actividad reciente' });
  }
};
