const User = require('../models/user.model');

// Obtener todos los usuarios (solo admin)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

// Obtener un usuario por ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ message: 'Error al obtener usuario' });
  }
};

// Actualizar un usuario
exports.updateUser = async (req, res) => {
  try {
    const { username, email, isActive } = req.body;
    
    // Verificar si el usuario tiene permiso para actualizar
    if (!req.user.isAdmin && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ 
        message: 'No tienes permiso para actualizar este usuario' 
      });
    }
    
    // Buscar y actualizar usuario
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { username, email, isActive },
      { new: true }
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ message: 'Error al actualizar usuario' });
  }
};

// Cambiar contraseña de usuario
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Verificar si el usuario tiene permiso para cambiar la contraseña
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ 
        message: 'No tienes permiso para cambiar la contraseña de este usuario' 
      });
    }
    
    // Buscar usuario
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Verificar contraseña actual
    const isPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Contraseña actual incorrecta' });
    }
    
    // Actualizar contraseña
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ message: 'Error al cambiar contraseña' });
  }
};

// Eliminar un usuario (solo admin)
exports.deleteUser = async (req, res) => {
  try {
    // Solo administradores pueden eliminar usuarios
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        message: 'No tienes permiso para eliminar usuarios' 
      });
    }
    
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    
    if (!deletedUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.status(200).json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ message: 'Error al eliminar usuario' });
  }
};

// Obtener ubicaciones en tiempo real de los usuarios activos (solo admin)
exports.getActiveLocations = async (req, res) => {
  try {
    // Solo administradores pueden ver ubicaciones en tiempo real
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        message: 'No tienes permiso para acceder a las ubicaciones en tiempo real' 
      });
    }

    // Importar el modelo de Location
    const Location = require('../models/location.model');
    
    // Obtener la fecha de hoy (inicio del día)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Obtener usuarios activos
    const activeUsers = await User.find({ isActive: true }).select('_id username');
    console.log(`Usuarios activos encontrados: ${activeUsers.length}`);
    
    // Para cada usuario activo, buscar su ubicación más reciente de hoy
    const activeLocations = [];
    
    for (const user of activeUsers) {
      // Buscar la ubicación más reciente del día de hoy
      const latestLocation = await Location.findOne({ 
        userId: user._id,
        timestamp: { $gte: today } // Solo ubicaciones de hoy
      }).sort({ timestamp: -1 }).limit(1);
      
      // Si existe una ubicación para este usuario de hoy, añadirla al resultado
      if (latestLocation) {
        // Verificar si la ubicación es reciente (últimos 10 minutos)
        const isRecent = (new Date() - new Date(latestLocation.timestamp)) < (10 * 60 * 1000); // 10 minutos
        
        if (isRecent) {
          activeLocations.push({
            userId: user._id,
            username: user.username,
            latitude: latestLocation.latitude,
            longitude: latestLocation.longitude,
            timestamp: latestLocation.timestamp,
            type: latestLocation.type,
            isOnline: true
          });
        }
      }
    }
    
    console.log(`Enviando ${activeLocations.length} ubicaciones activas`);
    res.status(200).json({ locations: activeLocations });
  } catch (error) {
    console.error('Error al obtener ubicaciones en tiempo real:', error);
    res.status(500).json({ message: 'Error al obtener ubicaciones en tiempo real' });
  }
};
