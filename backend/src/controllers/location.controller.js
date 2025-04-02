const Location = require('../models/location.model');

// Iniciar trabajo (registrar ubicación de inicio)
exports.startWork = async (req, res) => {
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
      type: 'start',
      latitude,
      longitude
    });
    
    // Guardar en la base de datos
    await location.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Trabajo iniciado correctamente',
      location
    });
  } catch (error) {
    console.error('Error al iniciar trabajo:', error);
    res.status(500).json({ message: 'Error al iniciar trabajo' });
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
