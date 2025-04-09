const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Middleware para verificar el token JWT
const verifyToken = async (req, res, next) => {
  try {
    // Obtener el token del encabezado de autorización
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No se proporcionó token de autenticación' });
    }
    
    // Extraer el token
    const token = authHeader.split(' ')[1];
    
    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Guardar el ID del usuario decodificado
    req.userId = decoded.id;
    
    // Buscar el usuario en la base de datos
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Verificar si la ruta es de logout, si es así permitirle continuar aunque esté inactivo
    const isLogoutRequest = req.path === '/logout' && req.method === 'POST';
    
    if (!user.isActive && !isLogoutRequest) {
      return res.status(403).json({ message: 'Cuenta de usuario desactivada' });
    }
    
    // Adjuntar el usuario a la solicitud
    req.user = user;
    next();
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

// Middleware para verificar si el usuario es administrador
const isAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: 'Acceso denegado: se requieren permisos de administrador' });
  }
  next();
};

module.exports = { verifyToken, isAdmin };
