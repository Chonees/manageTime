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
    
    // Para cada usuario activo, verificar si está trabajando actualmente
    const activeLocations = [];
    
    for (const user of activeUsers) {
      // Buscar la ubicación más reciente del día de hoy
      const locations = await Location.find({ 
        userId: user._id,
        timestamp: { $gte: today } // Solo ubicaciones de hoy
      }).sort({ timestamp: -1 }).limit(10); // Obtenemos las últimas 10 para analizar
      
      if (locations.length > 0) {
        // Verificar si el usuario está trabajando actualmente
        // Esto significa que su registro más reciente es de tipo "start" o
        // que tiene un "start" más reciente que su último "end"
        
        let isWorking = false;
        let lastLocation = null;
        
        // Si el último registro es de tipo "start", está trabajando
        if (locations[0].type === 'start') {
          isWorking = true;
          lastLocation = locations[0];
        } else {
          // Si el último es "end", buscamos si hay un "start" sin su correspondiente "end"
          const lastEndTime = locations.find(loc => loc.type === 'end')?.timestamp;
          const lastStartAfterEnd = locations.find(
            loc => loc.type === 'start' && 
            (!lastEndTime || new Date(loc.timestamp) > new Date(lastEndTime))
          );
          
          if (lastStartAfterEnd) {
            isWorking = true;
            lastLocation = lastStartAfterEnd;
          }
        }
        
        // Si está trabajando, añadir su ubicación a la lista
        if (isWorking && lastLocation) {
          // Verificar si la ubicación es reciente (últimos 30 minutos)
          const isRecent = (new Date() - new Date(lastLocation.timestamp)) < (30 * 60 * 1000); // 30 minutos
          
          if (isRecent) {
            activeLocations.push({
              userId: user._id,
              username: user.username,
              latitude: lastLocation.latitude,
              longitude: lastLocation.longitude,
              timestamp: lastLocation.timestamp,
              type: lastLocation.type,
              isWorking: true
            });
          }
        }
      }
    }
    
    console.log(`Enviando ${activeLocations.length} ubicaciones de usuarios trabajando`);
    res.status(200).json({ locations: activeLocations });
  } catch (error) {
    console.error('Error al obtener ubicaciones en tiempo real:', error);
    res.status(500).json({ message: 'Error al obtener ubicaciones en tiempo real' });
  }
};
