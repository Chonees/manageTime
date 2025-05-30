const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Controlador para registrar un nuevo usuario
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
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
      isAdmin: false, // Por defecto, los usuarios no son administradores
      isActive: true
    });
    
    // Guardar usuario en la base de datos
    await user.save();
    
    // Generar token JWT
    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    // Responder con los datos del usuario (sin la contraseña)
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
      createdAt: user.createdAt
    };
    
    res.status(201).json({
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ message: 'Error al registrar usuario' });
  }
};

// Controlador para iniciar sesión
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('Intento de login:', { username });
    
    // Buscar usuario por nombre de usuario o email
    const user = await User.findOne({ 
      $or: [
        { username }, 
        { email: username } // Permitir iniciar sesión con email
      ]
    });
    
    if (!user) {
      console.log('Usuario no encontrado:', username);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    console.log('Usuario encontrado:', user.username);
    
    // Verificar contraseña
    const isPasswordValid = await user.comparePassword(password);
    
    console.log('Contraseña válida:', isPasswordValid);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    // Verificar si el usuario está activo, excepto para administradores
    if (!user.isActive && !user.isAdmin) {
      console.log('Intento de acceso de usuario desactivado:', username);
      return res.status(403).json({ message: 'Este usuario ha sido desactivado. Por favor, contacte al administrador.' });
    }
    
    // Si es un administrador y estaba desactivado, lo activamos automáticamente
    if (user.isAdmin && !user.isActive) {
      user.isActive = true;
      await user.save();
      console.log('Administrador reactivado automáticamente:', username);
    }
    
    // Generar token JWT
    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    // Responder con los datos del usuario (sin la contraseña)
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
      createdAt: user.createdAt
    };
    
    res.status(200).json({
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error al iniciar sesión', error: error.message });
  }
};

// Controlador para verificar token
exports.checkToken = async (req, res) => {
  try {
    // El middleware verifyToken ya verificó el token y adjuntó el usuario a req
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.status(200).json({ user });
  } catch (error) {
    console.error('Error al verificar token:', error);
    res.status(500).json({ message: 'Error al verificar token' });
  }
};

// Cierre de sesión (logout) de usuario
exports.logout = async (req, res) => {
  try {
    console.log('Intentando cerrar sesión para el usuario ID:', req.userId);
    
    // Verificar que el usuario está autenticado
    if (!req.userId) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    
    // Actualizar el estado del usuario a inactivo
    const result = await User.findByIdAndUpdate(
      req.userId, 
      { isActive: false },
      { new: true }
    );
    
    if (!result) {
      console.log('No se encontró el usuario para ID:', req.userId);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    console.log('Usuario desactivado correctamente:', result.username);
    res.status(200).json({ message: 'Sesión cerrada correctamente' });
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    res.status(500).json({ message: 'Error al cerrar sesión' });
  }
};
