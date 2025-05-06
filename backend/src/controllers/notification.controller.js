const AdminPushToken = require('../models/adminPushToken.model');
const User = require('../models/user.model');
const notificationUtil = require('../utils/notification.util');
const logger = require('../utils/logger');

/**
 * Registra un token de notificaciones para un administrador
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
exports.registerAdminToken = async (req, res) => {
  try {
    const { pushToken, userId } = req.body;
    const adminId = req.user.id;

    // Verificar si el usuario es administrador
    const user = await User.findById(adminId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Solo administradores pueden registrar tokens para notificaciones de administrador' 
      });
    }
    
    // Validar el token de push
    if (!pushToken || typeof pushToken !== 'string' || !pushToken.includes('ExponentPushToken')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token de notificaciones inválido' 
      });
    }

    // Buscar si ya existe un registro para este usuario
    let adminToken = await AdminPushToken.findOne({ userId: adminId });
    
    if (adminToken) {
      // Actualizar token existente
      adminToken.pushToken = pushToken;
      adminToken.lastUpdated = new Date();
      await adminToken.save();
      
      logger.info(`Token de administrador actualizado para ${user.username}`);
      return res.status(200).json({ 
        success: true, 
        message: 'Token de administrador actualizado correctamente',
        tokenId: adminToken._id
      });
    } else {
      // Crear nuevo registro
      adminToken = new AdminPushToken({
        userId: adminId,
        pushToken,
        createdAt: new Date(),
        lastUpdated: new Date(),
        isActive: true
      });
      
      await adminToken.save();
      
      logger.info(`Nuevo token de administrador registrado para ${user.username}`);
      return res.status(201).json({ 
        success: true, 
        message: 'Token de administrador registrado correctamente',
        tokenId: adminToken._id
      });
    }
  } catch (error) {
    logger.error('Error al registrar token de administrador:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al registrar token de administrador',
      error: error.message
    });
  }
};

/**
 * Envía una notificación de prueba a todos los administradores
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
exports.sendTestNotification = async (req, res) => {
  try {
    const adminId = req.user.id;
    
    // Verificar si el usuario es administrador
    const user = await User.findById(adminId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Solo administradores pueden enviar notificaciones de prueba' 
      });
    }
    
    // Obtener todos los tokens de administradores activos
    const adminTokens = await AdminPushToken.find({ isActive: true });
    
    if (adminTokens.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No hay tokens de administradores registrados' 
      });
    }
    
    const tokens = adminTokens.map(token => token.pushToken);
    
    // Enviar notificación de prueba
    const title = 'Notificación de prueba';
    const body = `Prueba enviada por ${user.username} el ${new Date().toLocaleString()}`;
    
    const result = await notificationUtil.sendPushNotifications(tokens, title, body, {
      type: 'admin_test',
      senderId: adminId,
      senderName: user.username
    });
    
    logger.info(`Notificación de prueba enviada por ${user.username} a ${tokens.length} administradores`);
    
    res.status(200).json({
      success: true,
      message: `Notificación de prueba enviada a ${tokens.length} administradores`,
      result
    });
  } catch (error) {
    logger.error('Error al enviar notificación de prueba:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al enviar notificación de prueba',
      error: error.message
    });
  }
};

/**
 * Verificar si hay tokens de administradores registrados
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
exports.checkAdminTokens = async (req, res) => {
  try {
    const count = await AdminPushToken.countDocuments({ isActive: true });
    
    res.status(200).json({
      success: true,
      count,
      hasTokens: count > 0
    });
  } catch (error) {
    logger.error('Error al verificar tokens de administradores:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al verificar tokens de administradores',
      error: error.message
    });
  }
};
