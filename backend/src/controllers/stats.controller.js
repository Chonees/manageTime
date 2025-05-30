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
      .limit(15)
      .populate('userId', 'username');
    
    // Obtener los últimos registros de ubicación
    const recentLocations = await Location.find()
      .sort({ timestamp: -1 })
      .limit(15)
      .populate('userId', 'username');
    
    // Obtener las últimas actividades del nuevo sistema
    const recentActivitiesFromDb = await Activity.find()
      .sort({ createdAt: -1 })
      .limit(15)
      .populate('userId', 'username')
      .populate('taskId', 'title');
      
    // Combinar y ordenar por fecha
    const activities = [
      ...recentTasks.map(task => ({
        id: task._id.toString(),
        type: 'task',
        action: task.completed ? 'completed' : 'created',
        username: task.userId ? task.userId.username : 'Usuario desconocido',
        title: task.title,
        timestamp: task.updatedAt,
        message: `${task.userId ? task.userId.username : 'Usuario desconocido'} ${task.completed ? 'completó' : 'creó'} la tarea: ${task.title}`
      })),
      ...recentLocations.map(location => ({
        id: location._id.toString(),
        type: 'location',
        action: location.type === 'start' ? 'location_enter' : 'location_exit',
        username: location.userId ? location.userId.username : 'Usuario desconocido',
        title: location.locationName || 'Unknown Location',
        timestamp: location.timestamp,
        message: `${location.userId ? location.userId.username : 'Usuario desconocido'} ${location.type === 'start' ? 'inició' : 'detuvo'} el trabajo en ${location.locationName || 'Unknown Location'}`
      })),
      ...recentActivitiesFromDb.map(activity => ({
        id: activity._id.toString(),
        type: activity.type.startsWith('task_') ? 'task' : 'location',
        action: activity.type.split('_')[1] || 'updated',
        username: activity.userId ? activity.userId.username : 'Usuario desconocido',
        title: activity.taskId ? activity.taskId.title : (activity.metadata?.locationName || 'Unknown Location'),
        timestamp: activity.createdAt,
        message: activity.message || `${activity.userId ? activity.userId.username : 'Usuario desconocido'} ${activity.type}`
      }))
    ];
    
    // Ordenar por fecha (más reciente primero)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Limitar a 15 actividades
    const recentActivities = activities.slice(0, 15);
    
    console.log('Sending recent activities:', recentActivities);
    res.status(200).json(recentActivities);
  } catch (error) {
    console.error('Error al obtener actividad reciente:', error);
    res.status(500).json({ 
      message: 'Error al obtener actividad reciente', 
      error: error.message 
    });
  }
};
