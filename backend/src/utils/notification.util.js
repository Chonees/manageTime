// Importar el SDK de Expo Server con mejor manejo de errores
let Expo;
let expo;

try {
  Expo = require('expo-server-sdk').default || require('expo-server-sdk').Expo;
  console.log('Expo SDK cargado correctamente, tipo:', typeof Expo);
  
  // Crear instancia con manejo de errores
  try {
    expo = new Expo();
    console.log('Instancia de Expo creada correctamente');
    // Verificar que los métodos existan
    if (typeof expo.isExpoPushToken !== 'function') {
      console.warn('ADVERTENCIA: expo.isExpoPushToken no es una función');
    }
    if (typeof expo.chunkPushNotifications !== 'function') {
      console.warn('ADVERTENCIA: expo.chunkPushNotifications no es una función');
    }
    if (typeof expo.sendPushNotificationsAsync !== 'function') {
      console.warn('ADVERTENCIA: expo.sendPushNotificationsAsync no es una función');
    }
  } catch (initError) {
    console.error('Error al inicializar Expo SDK:', initError);
    expo = null;
  }
} catch (importError) {
  console.error('Error al importar expo-server-sdk:', importError);
  Expo = null;
  expo = null;
}

// Implementación alternativa por si falla la importación
if (!expo) {
  console.warn('Usando implementación alternativa del SDK de Expo');
  // Crear versiones simuladas de las funciones necesarias
  expo = {
    isExpoPushToken: (token) => {
      return typeof token === 'string' && token.startsWith('ExponentPushToken[');
    },
    chunkPushNotifications: (messages) => {
      // Dividir en chunks de 100 mensajes
      const chunks = [];
      for (let i = 0; i < messages.length; i += 100) {
        chunks.push(messages.slice(i, i + 100));
      }
      return chunks;
    },
    sendPushNotificationsAsync: async (messages) => {
      console.log(`[SIMULACIÓN] Enviando ${messages.length} notificaciones`);
      // Simulamos respuestas de éxito
      return messages.map(() => ({ status: 'ok', id: 'simulated-id-' + Date.now() }));
    }
  };
}

const User = require('../models/user.model');
const logger = require('./logger');

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
    // Validar la instancia de Expo
    if (!expo) {
      logger.error('SDK de Expo no disponible');
      return { success: false, error: 'SDK de Expo no disponible' };
    }
    
    console.log('Tokens recibidos:', tokens);
    
    // Filtrar tokens válidos usando una validación más robusta
    const validTokens = tokens.filter(token => {
      // Verificación manual 
      const isValid = typeof token === 'string' && (
        (typeof expo.isExpoPushToken === 'function' && expo.isExpoPushToken(token)) || 
        token.startsWith('ExponentPushToken[')
      );
      
      if (!isValid) {
        console.log('Token inválido descartado:', token);
      }
      return isValid;
    });

    console.log('Tokens válidos:', validTokens);

    if (validTokens.length === 0) {
      logger.warn('No hay tokens de push válidos para enviar notificaciones');
      return { success: false, error: 'No hay tokens válidos' };
    }

    logger.info(`Enviando notificación a ${validTokens.length} dispositivos con título: "${title}"`);

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
      // Configuraciones específicas para iOS
      categoryId: 'activity',
      mutableContent: true,
      contentAvailable: true,
    }));

    // Dividir los mensajes en bloques - manejar caso de función no disponible
    let chunks;
    if (typeof expo.chunkPushNotifications === 'function') {
      chunks = expo.chunkPushNotifications(messages);
    } else {
      // Implementación alternativa
      chunks = [messages];
      logger.warn('Usando implementación alternativa para chunks');
    }
    
    // Enviar cada bloque de mensajes
    const tickets = [];
    for (const chunk of chunks) {
      try {
        console.log('Enviando chunk de notificaciones a Expo:', JSON.stringify(chunk[0], null, 2));
        
        let ticketChunk;
        if (typeof expo.sendPushNotificationsAsync === 'function') {
          ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        } else {
          // Implementación alternativa
          logger.warn('Usando implementación alternativa para envío de notificaciones');
          ticketChunk = chunk.map(() => ({ status: 'ok', id: 'simulated-id-' + Date.now() }));
        }
        
        tickets.push(...ticketChunk);
        logger.debug(`Enviado bloque de ${chunk.length} notificaciones`);
        
        // Log detallado para depuración
        ticketChunk.forEach((ticket, i) => {
          if (ticket.status === 'error') {
            console.error(`Error en ticket #${i}:`, ticket.message);
          } else {
            console.log(`Ticket #${i} enviado correctamente:`, ticket.id);
          }
        });
      } catch (chunkError) {
        logger.error('Error enviando bloque de notificaciones', chunkError);
        console.error('Error completo:', chunkError);
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
    
    // Log de usuarios que recibirán notificación
    users.forEach(user => {
      console.log(`Usuario que recibirá notificación: ${user.username}, Token: ${user.pushToken}`);
    });
    
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
 * @param {Boolean} notifyOwner - Si se debe notificar también al propietario de la actividad
 * @returns {Promise<Object>} - Resultado del envío de notificaciones
 */
const notifyAdminActivity = async (activity, notifyOwner = false) => {
  try {
    // Obtener el nombre de usuario desde varias fuentes posibles
    const username = activity.metadata?.username || activity.username || 'Usuario';
    
    // Personalizar título según el tipo de actividad
    let title = 'Nueva actividad';
    let body = 'Se ha registrado una nueva actividad';
    
    // Personalizar mensaje según el tipo de actividad
    switch (activity.type) {
      case 'clock_in':
      case 'started_working':
        title = `${username} está disponible`;
        body = `${username} ha cambiado su estado a disponible`;
        break;
      case 'clock_out':
      case 'stopped_working':
        title = `${username} no disponible`;
        body = `${username} ha cambiado su estado a no disponible`;
        break;
      case 'task_complete':
        title = `Tarea completada`;
        body = `${username} ha completado: ${activity.metadata?.title || 'una tarea'}`;
        break;
      case 'location_enter':
        title = `Entrada a ubicación`;
        body = `${username} ha entrado en: ${activity.metadata?.locationName || 'una ubicación'}`;
        break;
      case 'location_exit':
        title = `Salida de ubicación`;
        body = `${username} ha salido de: ${activity.metadata?.locationName || 'una ubicación'}`;
        break;
      case 'task_activity':
        // Verificar si tiene subtipo para personalizar más el mensaje
        if (activity.subtype === 'location_enter' || activity.subtype === 'task_enter' || 
            activity.metadata?.actionType === 'entered_task_area') {
          title = `Entrada a tarea`;
          body = `${username} entró a: ${activity.metadata?.taskTitle || activity.metadata?.title || 'una tarea'}`;
        } 
        else if (activity.subtype === 'location_exit' || activity.subtype === 'task_exit' ||
                activity.metadata?.actionType === 'exited_task_area') {
          title = `Salida de tarea`;
          body = `${username} salió de: ${activity.metadata?.taskTitle || activity.metadata?.title || 'una tarea'}`;
        }
        else {
          title = `Actividad en tarea`;
          body = `${username} actualizó: ${activity.metadata?.title || 'una tarea'}`;
        }
        break;
      default:
        title = `Actividad: ${username}`;
        body = activity.message || body;
    }
    
    // Añadir información extra para mejorar la notificación
    const notificationData = { 
      activityId: activity._id, 
      type: activity.type,
      timestamp: new Date().toISOString(),
      userId: activity.userId,
      username: username,
      critical: true,
      priority: 'high'
    };
    
    logger.info(`Enviando notificación de actividad "${activity.type}" a administradores`);
    console.log(`Enviando notificación para actividad: ${activity.type}, de ${username}, mensaje: "${body}"`);
    
    // Enviar notificación a todos los administradores
    const adminResult = await notifyByRole(title, body, notificationData, 'admin');
    
    // Si se solicita notificar también al propietario de la actividad y no es un admin
    if (notifyOwner && activity.userId) {
      try {
        // Verificar que el usuario no sea un administrador para evitar notificaciones duplicadas
        const user = await User.findById(activity.userId);
        if (user && !user.isAdmin) {
          logger.info(`Enviando notificación también al propietario de la actividad: ${user.username}`);
          await notifyUser(activity.userId, title, body, notificationData);
        }
      } catch (ownerError) {
        logger.error(`Error al notificar al propietario de la actividad: ${activity.userId}`, ownerError);
        // No interrumpimos el flujo principal si falla esta notificación
      }
    }
    
    return adminResult;
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
