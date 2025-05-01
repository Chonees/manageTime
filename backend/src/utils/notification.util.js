const { Expo } = require('expo-server-sdk');
const User = require('../models/user.model');
const logger = require('./logger');

// Crear una instancia de Expo SDK
const expo = new Expo();

/**
 * Envía notificaciones push a múltiples dispositivos
 * @param {Array} tokens - Array de tokens de dispositivos
 * @param {String} title - Título de la notificación
 * @param {String} body - Cuerpo de la notificación
 * @param {Object} data - Datos adicionales para la notificación
 * @returns {Promise<Object>} - Resultado del envío de notificaciones
 */
const sendPushNotifications = async (tokens, title, body, data = {}) => {
  try {
    // Filtrar tokens válidos
    const validTokens = tokens.filter(token => 
      Expo.isExpoPushToken(token) || token.startsWith('ExponentPushToken[')
    );

    if (validTokens.length === 0) {
      logger.warn('No hay tokens de push válidos para enviar notificaciones');
      return { success: false, error: 'No hay tokens válidos' };
    }

    // Crear mensajes para cada token
    const messages = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title: title,
      body: body,
      data: { ...data, timestamp: new Date().toISOString() },
    }));

    // Dividir en fragmentos si hay muchos mensajes
    const chunks = expo.chunkPushNotifications(messages);
    
    // Enviar cada fragmento
    const tickets = [];
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        logger.info(`Enviado fragmento con ${chunk.length} notificaciones`);
      } catch (error) {
        logger.error('Error enviando fragmento de notificaciones', error);
      }
    }

    logger.info(`Enviadas ${tickets.length} notificaciones push`);
    return { success: true, tickets };
  } catch (error) {
    logger.error('Error enviando notificaciones push', error);
    return { success: false, error: error.message };
  }
};

/**
 * Envía notificaciones a todos los usuarios con un rol específico
 * @param {String} title - Título de la notificación
 * @param {String} body - Cuerpo de la notificación
 * @param {Object} data - Datos adicionales para la notificación
 * @param {String} role - Rol de los usuarios (admin, user, null para todos)
 * @returns {Promise<Object>} - Resultado del envío de notificaciones
 */
const notifyByRole = async (title, body, data = {}, role = null) => {
  try {
    // Construir filtro según el rol
    const filter = role ? { role } : {};
    
    // Buscar usuarios con tokens de push
    const users = await User.find({
      ...filter,
      pushToken: { $exists: true, $ne: "" }
    });

    if (users.length === 0) {
      logger.warn(`No hay usuarios ${role || 'registrados'} con tokens de push`);
      return { success: false, error: 'No hay destinatarios' };
    }

    // Extraer tokens
    const tokens = users.map(user => user.pushToken).filter(Boolean);
    
    // Enviar notificaciones
    return await sendPushNotifications(tokens, title, body, data);
  } catch (error) {
    logger.error('Error notificando por rol', error);
    return { success: false, error: error.message };
  }
};

/**
 * Notifica a un usuario específico por su ID
 * @param {String} userId - ID del usuario
 * @param {String} title - Título de la notificación
 * @param {String} body - Cuerpo de la notificación
 * @param {Object} data - Datos adicionales para la notificación
 * @returns {Promise<Object>} - Resultado del envío de notificaciones
 */
const notifyUser = async (userId, title, body, data = {}) => {
  try {
    const user = await User.findById(userId);
    
    if (!user || !user.pushToken) {
      logger.warn(`Usuario ${userId} no encontrado o sin token de push`);
      return { success: false, error: 'Usuario sin token de push' };
    }
    
    return await sendPushNotifications([user.pushToken], title, body, data);
  } catch (error) {
    logger.error(`Error notificando al usuario ${userId}`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Notifica a los administradores sobre una actividad
 * @param {Object} activity - Objeto de actividad
 * @returns {Promise<Object>} - Resultado del envío de notificaciones
 */
const notifyAdminActivity = async (activity) => {
  try {
    const title = 'Nueva actividad';
    let body = 'Se ha registrado una nueva actividad';
    
    // Personalizar mensaje según el tipo de actividad
    switch (activity.type) {
      case 'clock_in':
        body = `${activity.username || 'Un usuario'} está ahora disponible`;
        break;
      case 'clock_out':
        body = `${activity.username || 'Un usuario'} ya no está disponible`;
        break;
      case 'task_complete':
        body = `${activity.username || 'Un usuario'} ha completado una tarea: ${activity.metadata?.title || ''}`;
        break;
      case 'location_enter':
      case 'location_exit':
        body = `${activity.username || 'Un usuario'} ha ${activity.type === 'location_enter' ? 'entrado en' : 'salido de'} una ubicación asignada`;
        break;
      default:
        body = activity.message || body;
    }
    
    // Enviar notificación a todos los administradores
    return await notifyByRole(title, body, { activityId: activity._id, type: activity.type }, 'admin');
  } catch (error) {
    logger.error('Error notificando actividad a administradores', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPushNotifications,
  notifyByRole,
  notifyUser,
  notifyAdminActivity
};
