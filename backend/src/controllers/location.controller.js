const Location = require('../models/location.model');
const Task = require('../models/task.model');
const mongoose = require('mongoose');

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
    
    // Crear nuevo registro de ubicación
    const location = new Location({
      userId: req.user._id,
      type: 'end',
      latitude,
      longitude
    });
    
    // Guardar en la base de datos
    await location.save();
    
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
    
    // Validar que se haya enviado un array de ubicaciones
    if (!locations || !Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({ 
        message: 'Se requiere un array de ubicaciones para procesar' 
      });
    }
    
    console.log(`Procesando lote de ${locations.length} ubicaciones para el usuario ${req.user._id}`);
    
    // Array para almacenar los resultados
    const savedLocations = [];
    const errors = [];
    
    // Procesar cada ubicación en el lote
    for (const loc of locations) {
      try {
        // Validar que tenga las propiedades necesarias
        if (!loc.latitude || !loc.longitude) {
          errors.push({
            location: loc,
            error: 'Coordenadas de ubicación faltantes'
          });
          continue;
        }
        
        // Crear nuevo registro de ubicación
        const location = new Location({
          userId: req.user._id,
          type: loc.type || 'tracking',
          latitude: loc.latitude,
          longitude: loc.longitude,
          // Si la ubicación tiene timestamp, usarlo; de lo contrario, usar la fecha actual
          timestamp: loc.timestamp || new Date()
        });
        
        // Guardar en la base de datos
        await location.save();
        savedLocations.push(location);
      } catch (locError) {
        console.error('Error al guardar ubicación individual:', locError);
        errors.push({
          location: loc,
          error: locError.message
        });
      }
    }
    
    // Devolver los resultados
    res.status(201).json({
      success: true,
      message: `${savedLocations.length} ubicaciones guardadas correctamente`,
      savedCount: savedLocations.length,
      errorCount: errors.length,
      savedLocations,
      errors
    });
  } catch (error) {
    console.error('Error al procesar lote de ubicaciones:', error);
    res.status(500).json({ 
      message: 'Error al procesar lote de ubicaciones',
      error: error.message
    });
  }
};
