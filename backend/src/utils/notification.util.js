// Intentar importar expo-server-sdk de manera segura
let Expo;
try {
  Expo = require('expo-server-sdk').Expo;
} catch (error) {
  console.warn('No se pudo cargar expo-server-sdk, las notificaciones push estarán deshabilitadas');
  // Crear una implementación simulada
  Expo = class MockExpo {
    constructor() {}
    
    isExpoPushToken() { return false; }
    chunkPushNotifications() { return []; }
    sendPushNotificationsAsync() { return []; }
  };
}

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
      expo.isExpoPushToken(token) || token.startsWith('ExponentPushToken[')
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
      priority: 'high', // Alta prioridad para notificaciones importantes
      channelId: 'default', // Canal para Android
      badge: 1, // Incrementa el contador de notificaciones en iOS
      _displayInForeground: true, // Mostrar incluso si la app está en primer plano
    }));

    // Dividir los mensajes en bloques según recomendaciones de Expo
    const chunks = expo.chunkPushNotifications(messages);
    
    // Enviar cada bloque de mensajes
    const tickets = [];
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        logger.debug(`Enviado bloque de ${chunk.length} notificaciones`);
      } catch (chunkError) {
        logger.error('Error enviando bloque de notificaciones', chunkError);
      }
    }
    
    logger.info(`Enviadas ${tickets.length} notificaciones push de ${messages.length} solicitadas`);
    
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
    // Construir query para buscar usuarios con token
    const query = { pushToken: { $exists: true, $ne: null } };
    if (role) {
      query.isAdmin = role === 'admin';
    }
    
    // Buscar usuarios que coincidan con el rol
    const users = await User.find(query);
    
    if (users.length === 0) {
      logger.warn(`No hay usuarios con rol ${role || 'cualquiera'} con tokens registrados`);
      return { success: false, error: 'No hay usuarios con tokens' };
    }
    
    // Extraer tokens
    const tokens = users.map(user => user.pushToken).filter(Boolean);
    logger.info(`Enviando notificación a ${tokens.length} usuarios con rol ${role || 'cualquiera'}`);
    
    // Enviar notificaciones
    return await sendPushNotifications(tokens, title, body, data);
  } catch (error) {
    logger.error(`Error notificando a usuarios con rol ${role}`, error);
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
      logger.warn(`Usuario ${userId} no tiene token de push registrado`);
      return { success: false, error: 'Usuario sin token' };
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
    
    // Añadir información extra para mejorar la notificación
    const notificationData = { 
      activityId: activity._id, 
      type: activity.type,
      timestamp: new Date().toISOString(),
      userId: activity.userId,
      critical: ['clock_in', 'clock_out', 'task_complete'].includes(activity.type)
    };
    
    logger.info(`Enviando notificación de actividad "${activity.type}" a administradores`);
    
    // Enviar notificación a todos los administradores
    return await notifyByRole(title, body, notificationData, 'admin');
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
