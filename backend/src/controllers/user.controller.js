const User = require('../models/user.model');

// Crear un nuevo usuario (solo admin)
exports.createUser = async (req, res) => {
  try {
    // Verificar si el usuario tiene permisos de administrador
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        message: 'No tienes permiso para crear usuarios' 
      });
    }
    
    const { username, email, password, isAdmin } = req.body;
    
    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'El usuario o correo electrónico ya está registrado' 
      });
    }
    
    // Crear nuevo usuario
    const user = new User({
      username,
      email,
      password,
      isAdmin: isAdmin || false,
      isActive: true
    });
    
    // Guardar usuario en la base de datos
    await user.save();
    
    // Responder con los datos del usuario (sin la contraseña)
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
      createdAt: user.createdAt
    };
    
    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ message: 'Error al crear usuario' });
  }
};

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
    const { username, email, isActive, isAdmin } = req.body;
    
    // Verificar si el usuario tiene permiso para actualizar
    if (!req.user.isAdmin && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ 
        message: 'No tienes permiso para actualizar este usuario' 
      });
    }
    
    // Solo los administradores pueden cambiar el rol isAdmin de un usuario
    const updateData = { username, email, isActive };
    
    // Si el usuario que hace la petición es admin y envió el campo isAdmin, lo incluimos
    if (req.user.isAdmin && isAdmin !== undefined) {
      updateData.isAdmin = isAdmin;
      console.log(`Actualizando rol de administrador para usuario ${req.params.id} a: ${isAdmin}`);
    }
    
    // Buscar y actualizar usuario
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
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
    
    // Obtener usuarios activos
    const activeUsers = await User.find({ isActive: true }).select('_id username');
    
    // Para cada usuario activo, buscar su ubicación más reciente
    const activeLocations = [];
    
    for (const user of activeUsers) {
      // Buscar la ubicación más reciente (independientemente del tipo)
      const latestLocation = await Location.findOne({ 
        userId: user._id 
      }).sort({ timestamp: -1 }).limit(1);
      
      // Si existe una ubicación para este usuario, añadirla al resultado
      if (latestLocation) {
        activeLocations.push({
          userId: user._id,
          username: user.username,
          latitude: latestLocation.latitude,
          longitude: latestLocation.longitude,
          timestamp: latestLocation.timestamp,
          type: latestLocation.type
        });
      }
    }
    
    res.status(200).json({ locations: activeLocations });
  } catch (error) {
    console.error('Error al obtener ubicaciones en tiempo real:', error);
    res.status(500).json({ message: 'Error al obtener ubicaciones en tiempo real' });
  }
};

// Resetear todos los usuarios a inactivo (solo admin)
exports.resetAllUsersToInactive = async (req, res) => {
  try {
    await User.updateMany({}, { isActive: false });
    res.status(200).json({
      message: 'All users marked as inactive successfully'
    });
  } catch (error) {
    console.error('Error resetting users active status:', error);
    res.status(500).json({
      message: 'Error resetting users active status',
      error: error.message
    });
  }
};

// Registrar o actualizar token de notificaciones push
exports.registerPushToken = async (req, res) => {
  try {
    const { pushToken } = req.body;
    const userId = req.userId;
    
    if (!pushToken) {
      return res.status(400).json({
        message: 'Push token is required'
      });
    }
    
    // Actualizar usuario con el nuevo token
    await User.findByIdAndUpdate(userId, { pushToken });
    
    res.status(200).json({
      message: 'Push token registered successfully'
    });
  } catch (error) {
    console.error('Error registering push token:', error);
    res.status(500).json({
      message: 'Error registering push token',
      error: error.message
    });
  }
};
