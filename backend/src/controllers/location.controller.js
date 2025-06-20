const Location = require('../models/location.model');
const Task = require('../models/task.model');
const Activity = require('../models/activity.model');
const mongoose = require('mongoose');

// Registrar ubicación en tiempo real
exports.realTimeLocation = async (req, res) => {
  try {
    const { latitude, longitude, accuracy, altitude, heading, speed, timestamp } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        message: 'Se requieren las coordenadas de ubicación' 
      });
    }
    
    // Crear nuevo registro de ubicación con tipo 'tracking'
    const location = new Location({
      userId: req.user._id,
      type: 'tracking',
      latitude,
      longitude,
      metadata: {
        accuracy,
        altitude,
        heading,
        speed,
        timestamp: timestamp || new Date().toISOString()
      }
    });
    
    // Guardar en la base de datos
    await location.save();
    
    // No creamos una actividad para cada actualización en tiempo real
    // para evitar saturar el panel de administrador
    
    res.status(201).json({ 
      success: true, 
      message: 'Ubicación en tiempo real registrada',
      location
    });
  } catch (error) {
    console.error('Error al registrar ubicación en tiempo real:', error);
    res.status(500).json({ message: 'Error al registrar ubicación en tiempo real' });
  }
};

// Guardar lote de ubicaciones 
exports.saveBatchLocations = async (req, res) => {
  try {
    const { locations } = req.body;
    
    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({ 
        message: 'Se requiere un array de ubicaciones' 
      });
    }
    
    // Procesar cada ubicación del lote
    const savedLocations = [];
    
    for (const loc of locations) {
      const { latitude, longitude, timestamp } = loc;
      
      if (!latitude || !longitude) {
        continue; // Saltamos ubicaciones sin coordenadas válidas
      }
      
      // Crear nuevo registro de ubicación
      const location = new Location({
        userId: req.user._id,
        type: 'tracking',
        latitude,
        longitude,
        timestamp: timestamp || new Date().toISOString(),
        metadata: loc.metadata || {}
      });
      
      // Guardar en la base de datos
      await location.save();
      savedLocations.push(location);
    }
    
    // Si no se guardó ninguna ubicación, devolver error
    if (savedLocations.length === 0) {
      return res.status(400).json({ 
        message: 'No se pudo guardar ninguna ubicación válida' 
      });
    }
    
    res.status(201).json({ 
      success: true, 
      message: `${savedLocations.length} ubicaciones guardadas correctamente`,
      savedLocations
    });
  } catch (error) {
    console.error('Error al guardar lote de ubicaciones:', error);
    res.status(500).json({ message: 'Error al guardar lote de ubicaciones' });
  }
};

// Iniciar trabajo (registrar ubicación de inicio)
exports.startWork = async (req, res) => {
  try {
    const { latitude, longitude, type } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        message: 'Se requieren las coordenadas de ubicación' 
      });
    }
    
    // Crear nuevo registro de ubicación
    // Si se especifica un tipo (como 'tracking'), usarlo; de lo contrario, usar 'start'
    const location = new Location({
      userId: req.user._id,
      type: type || 'start',
      latitude,
      longitude
    });
    
    // Guardar en la base de datos
    await location.save();
    
    // También crear una actividad para que aparezca en el panel de administrador
    // Siempre usamos location_check para el seguimiento de ubicación
    const activityType = 'location_check';
    const activityMessage = type === 'tracking' ? 'Punto de seguimiento registrado' : 'Disponible';
    
    const activity = new Activity({
      userId: req.user._id,
      type: activityType,
      message: activityMessage,
      metadata: {
        latitude,
        longitude,
        locationType: type || 'start',
        locationId: location._id
      }
    });
    
    await activity.save();
    
    // Mensaje personalizado según el tipo
    const message = type === 'tracking' 
      ? 'Punto de seguimiento guardado correctamente'
      : 'Trabajo iniciado correctamente';
    
    res.status(201).json({ 
      success: true, 
      message: message,
      location
    });
  } catch (error) {
    console.error('Error al iniciar trabajo o guardar punto:', error);
    res.status(500).json({ message: 'Error al iniciar trabajo o guardar punto' });
  }
};

// Finalizar trabajo (registrar ubicación de fin)
exports.endWork = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        message: 'Se requieren las coordenadas de ubicación' 
      });
    }
    
    // Crear nuevo registro de ubicación de fin
    const location = new Location({
      userId: req.user._id,
      type: 'end',
      latitude,
      longitude
    });
    
    // Guardar en la base de datos
    await location.save();
    
    // También crear una actividad para que aparezca en el panel de administrador
    const activity = new Activity({
      userId: req.user._id,
      type: 'location_check',
      message: 'No disponible',
      metadata: {
        latitude,
        longitude,
        locationType: 'end',
        locationId: location._id
      }
    });
    
    await activity.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Trabajo finalizado correctamente',
      location
    });
  } catch (error) {
    console.error('Error al finalizar trabajo:', error);
    res.status(500).json({ message: 'Error al finalizar trabajo' });
  }
};

// Obtener historial de ubicaciones del usuario actual
exports.getMyLocationHistory = async (req, res) => {
  try {
    const locations = await Location.find({ userId: req.user._id })
                                    .sort({ timestamp: -1 });
    
    res.status(200).json(locations);
  } catch (error) {
    console.error('Error al obtener historial de ubicaciones:', error);
    res.status(500).json({ message: 'Error al obtener historial de ubicaciones' });
  }
};

// Obtener historial de ubicaciones de un usuario específico (solo admin)
exports.getUserLocationHistory = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const locations = await Location.find({ userId })
                                    .sort({ timestamp: -1 });
    
    res.status(200).json(locations);
  } catch (error) {
    console.error('Error al obtener historial de ubicaciones del usuario:', error);
    res.status(500).json({ message: 'Error al obtener historial de ubicaciones del usuario' });
  }
};

// Obtener historial de ubicaciones del usuario actual con tareas cercanas
exports.getMyLocationHistoryWithTasks = async (req, res) => {
  try {
    // Get the user's location history
    const locations = await Location.find({ userId: req.user._id })
                                    .sort({ timestamp: -1 })
                                    .limit(100); // Limit to last 100 locations
    
    // Create a response array with location and nearby tasks
    const locationsWithTasks = [];
    
    // For each location, find nearby tasks
    for (const location of locations) {
      // Find tasks within 1km of this location
      const nearbyTasks = await Task.find({
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [location.longitude, location.latitude]
            },
            $maxDistance: 1000 // 1km in meters
          }
        }
      }).limit(10); // Limit to 10 closest tasks
      
      // Add to response array
      locationsWithTasks.push({
        _id: location._id,
        userId: location.userId,
        type: location.type,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
        nearbyTasks: nearbyTasks.map(task => ({
          _id: task._id,
          title: task.title,
          description: task.description,
          completed: task.completed,
          location: task.location,
          radius: task.radius,
          locationName: task.locationName
        }))
      });
    }
    
    res.status(200).json(locationsWithTasks);
  } catch (error) {
    console.error('Error al obtener historial de ubicaciones con tareas:', error);
    res.status(500).json({ message: 'Error al obtener historial de ubicaciones con tareas' });
  }
};

// Obtener historial de ubicaciones de un usuario específico con tareas cercanas (solo admin)
exports.getUserLocationHistoryWithTasks = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Validate if userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'ID de usuario inválido' });
    }
    
    // Get the user's location history
    const locations = await Location.find({ userId })
                                    .sort({ timestamp: -1 })
                                    .limit(100); // Limit to last 100 locations
    
    // Create a response array with location and nearby tasks
    const locationsWithTasks = [];
    
    // For each location, find nearby tasks
    for (const location of locations) {
      // Find tasks within 1km of this location
      const nearbyTasks = await Task.find({
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [location.longitude, location.latitude]
            },
            $maxDistance: 1000 // 1km in meters
          }
        }
      }).limit(10); // Limit to 10 closest tasks
      
      // Add to response array
      locationsWithTasks.push({
        _id: location._id,
        userId: location.userId,
        type: location.type,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
        nearbyTasks: nearbyTasks.map(task => ({
          _id: task._id,
          title: task.title,
          description: task.description,
          completed: task.completed,
          location: task.location,
          radius: task.radius,
          locationName: task.locationName
        }))
      });
    }
    
    res.status(200).json(locationsWithTasks);
  } catch (error) {
    console.error('Error al obtener historial de ubicaciones con tareas del usuario:', error);
    res.status(500).json({ message: 'Error al obtener historial de ubicaciones con tareas del usuario' });
  }
};

// Guardar punto de seguimiento
exports.saveTrackingPoint = async (req, res) => {
  try {
    const { latitude, longitude, timestamp, description } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        message: 'Se requieren las coordenadas de ubicación' 
      });
    }
    
    // Crear nuevo registro de ubicación
    const location = new Location({
      userId: req.user._id,
      type: 'tracking',
      latitude,
      longitude,
      timestamp: timestamp || new Date(),
      description: description || 'Location tracking point'
    });
    
    // Guardar en la base de datos
    await location.save();
    
    // También crear una actividad para que aparezca en el panel de administrador
    const activity = new Activity({
      userId: req.user._id,
      type: 'location_check',
      message: 'Punto de seguimiento registrado',
      metadata: {
        latitude,
        longitude,
        locationType: 'tracking',
        locationId: location._id
      }
    });
    
    await activity.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Punto de seguimiento guardado correctamente',
      location
    });
  } catch (error) {
    console.error('Error al guardar punto de seguimiento:', error);
    res.status(500).json({ message: 'Error al guardar punto de seguimiento' });
  }
};

// Guardar múltiples ubicaciones en lote
exports.saveBatchLocations = async (req, res) => {
  try {
    const { locations } = req.body;
    const userId = req.user._id;
    
    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({ 
        message: 'Se requiere un array de ubicaciones válido' 
      });
    }
    
    // Validar cada ubicación
    for (const loc of locations) {
      if (!loc.latitude || !loc.longitude) {
        return res.status(400).json({ 
          message: 'Todas las ubicaciones deben tener latitud y longitud' 
        });
      }
    }
    
    // Preparar documentos para inserción masiva
    const locationDocs = locations.map(loc => ({
      userId,
      type: loc.type || 'tracking',
      latitude: loc.latitude,
      longitude: loc.longitude,
      description: loc.description || '',
      timestamp: loc.timestamp ? new Date(loc.timestamp) : new Date()
    }));
    
    // Insertar todas las ubicaciones
    const savedLocations = await Location.insertMany(locationDocs);
    
    // También crear actividades para cada ubicación
    const activityDocs = savedLocations.map(loc => {
      // Determinar el tipo de actividad basado en el tipo de ubicación
      let activityType, activityMessage;
      
      if (loc.type === 'start') {
        activityType = 'location_check';
        activityMessage = 'Disponible';
      } else if (loc.type === 'end') {
        activityType = 'location_check';
        activityMessage = 'No disponible';
      } else { // tracking
        activityType = 'location_check';
        activityMessage = 'Punto de seguimiento registrado';
      }
      
      return {
        userId,
        type: activityType,
        message: activityMessage,
        metadata: {
          latitude: loc.latitude,
          longitude: loc.longitude,
          locationType: loc.type,
          locationId: loc._id,
          timestamp: loc.timestamp
        },
        timestamp: loc.timestamp
      };
    });
    
    // Insertar todas las actividades
    await Activity.insertMany(activityDocs);
    
    res.status(201).json({ 
      success: true, 
      message: `${savedLocations.length} ubicaciones guardadas correctamente`,
      count: savedLocations.length,
      locations: savedLocations
    });
  } catch (error) {
    console.error('Error al guardar ubicaciones en lote:', error);
    res.status(500).json({ message: 'Error al guardar ubicaciones en lote' });
  }
};
