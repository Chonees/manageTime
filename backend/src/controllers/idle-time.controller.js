const IdleTime = require('../models/idle-time.model');
const Task = require('../models/task.model');
const mongoose = require('mongoose');

// Iniciar o reanudar una sesión de seguimiento de tiempo
exports.startSession = async (req, res) => {
  try {
    const userId = req.userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Verificar si ya existe una sesión activa para hoy
    let idleSession = await IdleTime.findOne({
      userId,
      date: { $gte: today },
      sessionActive: true
    });

    if (!idleSession) {
      // Crear una nueva sesión
      idleSession = new IdleTime({
        userId,
        date: new Date(),
        sessionStart: new Date(),
        idleStart: new Date(),
        isInTaskRadius: false,
        sessionActive: true
      });
    } else {
      // Reanudar sesión existente - solo actualizar idleStart si no está en un radio
      if (!idleSession.isInTaskRadius) {
        idleSession.idleStart = new Date();
      }
      idleSession.sessionActive = true;
      idleSession.lastUpdated = new Date();
    }

    await idleSession.save();

    res.status(200).json({
      success: true,
      message: 'Sesión de seguimiento de tiempo iniciada',
      session: idleSession
    });
  } catch (error) {
    console.error('Error al iniciar sesión de tiempo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión de tiempo',
      error: error.message
    });
  }
};

// Finalizar sesión de seguimiento de tiempo
exports.endSession = async (req, res) => {
  try {
    const userId = req.userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar la sesión activa
    const idleSession = await IdleTime.findOne({
      userId,
      date: { $gte: today },
      sessionActive: true
    });

    if (!idleSession) {
      return res.status(404).json({
        success: false,
        message: 'No hay sesión activa para finalizar'
      });
    }

    // Si no está en un radio de tarea, acumular tiempo idle
    if (!idleSession.isInTaskRadius) {
      const now = new Date();
      const idleTimeToAdd = now - new Date(idleSession.idleStart);
      idleSession.totalIdleTime += idleTimeToAdd;
    }

    idleSession.sessionActive = false;
    idleSession.lastUpdated = new Date();
    await idleSession.save();

    res.status(200).json({
      success: true,
      message: 'Sesión de seguimiento de tiempo finalizada',
      session: idleSession
    });
  } catch (error) {
    console.error('Error al finalizar sesión de tiempo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al finalizar sesión de tiempo',
      error: error.message
    });
  }
};

// Actualizar estado dentro/fuera de radio de tarea
exports.updateTaskRadius = async (req, res) => {
  try {
    const userId = req.userId;
    const { isInTaskRadius, taskId } = req.body;
    
    if (typeof isInTaskRadius !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'El parámetro isInTaskRadius debe ser un booleano'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar la sesión activa
    const idleSession = await IdleTime.findOne({
      userId,
      date: { $gte: today },
      sessionActive: true
    });

    if (!idleSession) {
      return res.status(404).json({
        success: false,
        message: 'No hay sesión activa para actualizar'
      });
    }

    const now = new Date();
    
    // Si estaba fuera de radio y ahora está dentro, acumular tiempo idle
    if (!idleSession.isInTaskRadius && isInTaskRadius) {
      const idleTimeToAdd = now - new Date(idleSession.idleStart);
      idleSession.totalIdleTime += idleTimeToAdd;
      
      // Actualizar la tarea actual si se proporciona
      if (taskId) {
        const validTaskId = mongoose.Types.ObjectId.isValid(taskId) ? 
          mongoose.Types.ObjectId(taskId) : null;
        
        if (validTaskId) {
          const taskExists = await Task.exists({ _id: validTaskId });
          if (taskExists) {
            idleSession.currentTask = validTaskId;
          }
        }
      }
    } 
    // Si estaba dentro de radio y ahora está fuera, actualizar idleStart
    else if (idleSession.isInTaskRadius && !isInTaskRadius) {
      const productiveTimeToAdd = now - new Date(idleSession.lastUpdated);
      idleSession.totalProductiveTime += productiveTimeToAdd;
      idleSession.idleStart = now;
      idleSession.currentTask = null;
    }

    // Actualizar estado y timestamp
    idleSession.isInTaskRadius = isInTaskRadius;
    idleSession.lastUpdated = now;
    await idleSession.save();

    res.status(200).json({
      success: true,
      message: `Estado de radio actualizado a ${isInTaskRadius ? 'dentro' : 'fuera'} del radio`,
      session: idleSession
    });
  } catch (error) {
    console.error('Error al actualizar estado de radio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar estado de radio',
      error: error.message
    });
  }
};

// Obtener estadísticas de tiempo para un usuario y fecha específicos
exports.getStats = async (req, res) => {
  try {
    const userId = req.userId;
    let { date } = req.query;
    
    // Si no se proporciona fecha, usar hoy
    if (!date) {
      date = new Date();
    } else {
      date = new Date(date);
    }
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Buscar todas las sesiones del día
    const sessions = await IdleTime.find({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    }).populate('currentTask');

    // Si hay una sesión activa, actualizar estadísticas en tiempo real
    let totalIdleTime = 0;
    let totalProductiveTime = 0;
    let activeSession = null;

    sessions.forEach(session => {
      totalIdleTime += session.totalIdleTime;
      totalProductiveTime += session.totalProductiveTime;
      
      if (session.sessionActive) {
        activeSession = session;
        
        // Actualizar tiempo en tiempo real si la sesión está activa
        const now = new Date();
        if (session.isInTaskRadius) {
          // Si está en un radio, agregar tiempo productivo
          const additionalProductiveTime = now - new Date(session.lastUpdated);
          totalProductiveTime += additionalProductiveTime;
        } else {
          // Si no está en un radio, agregar tiempo idle
          const additionalIdleTime = now - new Date(session.idleStart);
          totalIdleTime += additionalIdleTime;
        }
      }
    });

    // Convertir milisegundos a minutos para una visualización más amigable
    const idleMinutes = Math.round(totalIdleTime / 60000);
    const productiveMinutes = Math.round(totalProductiveTime / 60000);
    const totalMinutes = idleMinutes + productiveMinutes;
    
    // Calcular porcentajes
    const idlePercentage = totalMinutes > 0 ? Math.round((idleMinutes / totalMinutes) * 100) : 0;
    const productivePercentage = totalMinutes > 0 ? Math.round((productiveMinutes / totalMinutes) * 100) : 0;

    res.status(200).json({
      success: true,
      stats: {
        date: startOfDay,
        idleTime: totalIdleTime,
        productiveTime: totalProductiveTime,
        idleMinutes,
        productiveMinutes,
        totalMinutes,
        idlePercentage,
        productivePercentage,
        hasActiveSession: !!activeSession,
        currentTask: activeSession ? activeSession.currentTask : null,
        isInTaskRadius: activeSession ? activeSession.isInTaskRadius : false
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de tiempo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de tiempo',
      error: error.message
    });
  }
};

// Obtener historial de tiempo para un rango de fechas (admin)
exports.getHistoryByUser = async (req, res) => {
  try {
    // Verificar que el usuario es administrador
    if (!req.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'No autorizado, se requieren privilegios de administrador'
      });
    }

    const { userId, startDate, endDate } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un ID de usuario'
      });
    }

    // Convertir fechas
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Obtener datos
    const sessions = await IdleTime.find({
      userId,
      date: { $gte: start, $lte: end }
    }).sort({ date: -1 }).populate('currentTask');

    // Agrupar por día
    const dailyStats = {};
    
    sessions.forEach(session => {
      const dateKey = session.date.toISOString().split('T')[0];
      
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = {
          date: session.date,
          idleTime: 0,
          productiveTime: 0,
          sessions: []
        };
      }
      
      dailyStats[dateKey].idleTime += session.totalIdleTime;
      dailyStats[dateKey].productiveTime += session.totalProductiveTime;
      dailyStats[dateKey].sessions.push(session);
    });

    // Convertir a array para facilitar procesamiento en frontend
    const stats = Object.values(dailyStats).map(day => ({
      ...day,
      idleMinutes: Math.round(day.idleTime / 60000),
      productiveMinutes: Math.round(day.productiveTime / 60000),
      totalMinutes: Math.round((day.idleTime + day.productiveTime) / 60000)
    }));

    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error al obtener historial de tiempo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial de tiempo',
      error: error.message
    });
  }
};
