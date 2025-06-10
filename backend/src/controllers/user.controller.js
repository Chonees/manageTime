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
    
    const { username, email, password, isAdmin, isSuperAdmin, assignedAdmin } = req.body;
    
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
      isSuperAdmin: isSuperAdmin || false,
      isActive: true,
      assignedAdmin: assignedAdmin || null
    });
    
    // Solo el superadmin puede asignar usuarios a administradores
    // Los administradores normales no pueden auto-asignarse usuarios
    
    // Guardar usuario en la base de datos
    await user.save();
    
    // Responder con los datos del usuario (sin la contraseña)
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      isActive: user.isActive,
      assignedAdmin: user.assignedAdmin,
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
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        message: 'No tienes permiso para ver usuarios' 
      });
    }
    
    let query = {};
    
    console.log(`Usuario solicitando getAllUsers: ${req.user.username}, isAdmin: ${req.user.isAdmin}, isSuperAdmin: ${req.user.isSuperAdmin}, ID: ${req.user._id}`);
    
    // Si es superadmin, puede ver todos los usuarios
    // Si es admin regular, solo ve los usuarios que tiene asignados + a sí mismo
    if (req.user.isAdmin && !req.user.isSuperAdmin) {
      // IMPORTANTE: Filtrado estricto para administradores normales
      // Solo pueden ver usuarios que están explícitamente asignados a ellos y a sí mismos
      query = { $or: [{ assignedAdmin: req.user._id }, { _id: req.user._id }] };
      console.log(`Administrador regular: Filtrando por usuarios asignados a: ${req.user._id}`);
    } else if (req.user.isSuperAdmin) {
      console.log('Superadmin: Mostrando todos los usuarios');
    }
    
    // Incluir opción de población para mostrar información del admin asignado
    const users = await User.find(query)
      .select('-password')
      .populate('assignedAdmin', 'username email'); // Poblar solo el nombre y email del admin
    
    console.log(`Usuarios encontrados: ${users.length}`);
    users.forEach(user => {
      if (user.assignedAdmin) {
        console.log(`Usuario ${user.username} tiene asignado admin: ${typeof user.assignedAdmin === 'object' ? user.assignedAdmin.username : user.assignedAdmin}`);
      }
    });
      
    res.status(200).json(users.map(user => {
      const userObj = user.toObject ? user.toObject() : user;
      
      // Asegurar que el campo assignedAdmin tenga el formato correcto
      if (userObj.assignedAdmin && typeof userObj.assignedAdmin === 'object') {
        console.log(`Mapeando usuario ${userObj.username}, admin asignado: ${userObj.assignedAdmin.username}`);
      } else if (userObj.assignedAdmin) {
        console.log(`Advertencia: Usuario ${userObj.username} tiene assignedAdmin que no es un objeto: ${userObj.assignedAdmin}`);
      }
      
      return userObj;
    }));
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

// Obtener un usuario por ID
exports.getUserById = async (req, res) => {
  try {
    // Obtener usuario solicitado
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('assignedAdmin', 'username email');
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Verificar permisos: Solo puede ver los detalles si:
    // 1. Es el propio usuario
    // 2. Es un superadmin
    // 3. Es el admin asignado a este usuario
    const isSelfQuery = req.user._id.toString() === req.params.id;
    const isSuperAdmin = req.user.isSuperAdmin;
    const isAssignedAdmin = user.assignedAdmin && 
                          user.assignedAdmin._id && 
                          user.assignedAdmin._id.toString() === req.user._id.toString();
                          
    if (!isSelfQuery && !isSuperAdmin && !isAssignedAdmin && !req.user.isAdmin) {
      return res.status(403).json({ 
        message: 'No tienes permiso para ver los detalles de este usuario' 
      });
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
    const { username, email, isActive, isAdmin, isSuperAdmin, assignedAdmin } = req.body;
    
    // Obtener el usuario a actualizar
    const userToUpdate = await User.findById(req.params.id);
    
    if (!userToUpdate) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Verificar permisos:
    // 1. El usuario puede actualizar su propio perfil
    // 2. Un superAdmin puede actualizar cualquier usuario
    // 3. Un admin normal solo puede actualizar sus usuarios asignados
    const isSelfUpdate = req.user._id.toString() === req.params.id;
    const isUserSuperAdmin = req.user.isSuperAdmin;
    const isAssignedToAdmin = userToUpdate.assignedAdmin && 
                           userToUpdate.assignedAdmin.toString() === req.user._id.toString();
    
    if (!isSelfUpdate && !isUserSuperAdmin && !isAssignedToAdmin) {
      return res.status(403).json({ 
        message: 'No tienes permiso para actualizar este usuario. Solo puedes actualizar usuarios asignados a ti.' 
      });
    }
    
    // Datos básicos que cualquiera puede actualizar de sí mismo
    const updateData = {};
    
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    
    // Solo admins pueden cambiar el estado de activación
    if (req.user.isAdmin && isActive !== undefined) {
      updateData.isActive = isActive;
    }
    
    // Solo superadmins pueden cambiar roles de admin y superadmin
    if (isUserSuperAdmin) {
      if (isAdmin !== undefined) {
        updateData.isAdmin = isAdmin;
        console.log(`Superadmin actualizando rol de administrador para usuario ${req.params.id} a: ${isAdmin}`);
      }
      
      if (isSuperAdmin !== undefined) {
        updateData.isSuperAdmin = isSuperAdmin;
        console.log(`Superadmin actualizando rol de superadministrador para usuario ${req.params.id} a: ${isSuperAdmin}`);
      }
    }
    
    // Gestión de asignación de usuarios a administradores:
    // Solo los superadministradores pueden asignar usuarios a administradores
    if (assignedAdmin !== undefined) {
      if (isUserSuperAdmin) {
        // Superadmin puede asignar cualquier usuario a cualquier admin
        updateData.assignedAdmin = assignedAdmin || null;
        console.log(`Superadmin asignando usuario ${req.params.id} al administrador: ${assignedAdmin}`);
      } else {
        // Los administradores normales no pueden asignar usuarios
        console.log(`Intento rechazado: Admin normal intentó asignar usuario ${req.params.id} a un administrador`);
      }
    }
    
    // Buscar y actualizar usuario
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password').populate('assignedAdmin', 'username email');
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'Error al actualizar el usuario' });
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
    
    // Buscar el usuario que se va a eliminar
    const userToDelete = await User.findById(req.params.id);
    
    if (!userToDelete) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Verificar permisos de eliminación:
    // 1. Superadmin puede eliminar a cualquier usuario
    // 2. Admin regular solo puede eliminar a usuarios asignados a él
    const isSuperAdmin = req.user.isSuperAdmin;
    const isAssignedToAdmin = userToDelete.assignedAdmin && 
                           userToDelete.assignedAdmin.toString() === req.user._id.toString();
    
    if (!isSuperAdmin && !isAssignedToAdmin) {
      return res.status(403).json({ 
        message: 'No tienes permiso para eliminar este usuario. Solo puedes eliminar usuarios asignados a ti.' 
      });
    }
    
    // Verificar que no se está intentando eliminar a un admin o superadmin (solo superadmin puede)
    if ((userToDelete.isAdmin || userToDelete.isSuperAdmin) && !isSuperAdmin) {
      return res.status(403).json({
        message: 'No tienes permiso para eliminar administradores. Solo un superadmin puede hacerlo.'
      });
    }
    
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    
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
    
    // Query para filtrar usuarios según el nivel de permisos:
    // - Superadmin puede ver todos los usuarios activos
    // - Admin regular solo ve los usuarios asignados a él
    let userQuery = { isActive: true };
    
    if (req.user.isAdmin && !req.user.isSuperAdmin) {
      userQuery.assignedAdmin = req.user._id;
    }
    
    // Obtener usuarios activos según permisos
    const activeUsers = await User.find(userQuery).select('_id username');
    
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
