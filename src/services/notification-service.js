import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl, getAdminActivities } from './api';
import { Platform } from 'react-native';

// Import fetchWithRetry directly to avoid circular dependencies
const fetchWithRetry = async (url, options, maxRetries = 3, delay = 1000) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};

// Configure notifications for the app - SOLO CONFIGURACIÓN, NO ENVÍA NOTIFICACIONES LOCALES
export const configureNotifications = async () => {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      return false;
    }

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    return true;
  } catch (error) {
    return false;
  }
};

// Función mejorada para verificar si un usuario es administrador
export const isUserAdmin = async () => {
  try {
    console.log('Verificando si el usuario es administrador...');
    
    // Intentar primero desde userInfo (guardado en login)
    const userInfoString = await AsyncStorage.getItem('userInfo');
    if (userInfoString) {
      const userInfo = JSON.parse(userInfoString);
      console.log('userInfo desde AsyncStorage:', userInfo);
      if (userInfo && userInfo.isAdmin === true) {
        console.log('Usuario es admin según userInfo');
        return true;
      }
    }
    
    // Intentar también desde user (usado en algunas partes de la app)
    const userString = await AsyncStorage.getItem('user');
    if (userString) {
      const user = JSON.parse(userString);
      console.log('user desde AsyncStorage:', user);
      if (user && user.isAdmin === true) {
        console.log('Usuario es admin según user');
        return true;
      }
    }
    
    // Intentar verificar directamente con el backend si tenemos un token válido
    const token = await AsyncStorage.getItem('token');
    if (token) {
      try {
        const url = `${getApiUrl()}/api/users/me`;
        console.log('Verificando admin status desde la API:', url);
        const response = await fetchWithRetry(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('Datos del usuario desde API:', userData);
          if (userData && userData.isAdmin === true) {
            console.log('Usuario es admin según API');
            
            // Actualizar el almacenamiento local con la información correcta
            await AsyncStorage.setItem('userInfo', JSON.stringify(userData));
            
            return true;
          }
        } else {
          console.log('Error al verificar con API:', response.status);
        }
      } catch (apiError) {
        console.error('Error al verificar admin con API:', apiError);
      }
    }
    
    console.log('Usuario NO es admin según verificaciones');
    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Función auxiliar para obtener texto legible del tipo de actividad
export const getActivityTypeText = (type) => {
  const typeMap = {
    'task_create': 'Task Created',
    'task_update': 'Task Updated',
    'task_complete': 'Task Completed',
    'task_delete': 'Task Deleted',
    'task_assign': 'Task Assigned',
    'location_enter': 'Location Entered',
    'location_exit': 'Location Exited',
    'clock_in': 'Available',
    'clock_out': 'Unavailable',
    'started_working': 'Available',
    'stopped_working': 'Unavailable',
    'task_activity': 'Task Activity'
  };
  
  return typeMap[type] || type;
};

// Función para verificar actividades nuevas
export const checkForNewActivities = async (lastCheckedTime, options = {}) => {
  try {
    const isAdmin = await isUserAdmin();
    if (!isAdmin || !lastCheckedTime) return { newActivities: [], count: 0 };
    
    console.log('Checking for new activities since', lastCheckedTime.toISOString());
    const response = await getAdminActivities({
      limit: options.limit || 50,
      sort: '-createdAt'
    });
    
    if (!response || !response.activities || !Array.isArray(response.activities)) {
      return { newActivities: [], count: 0 };
    }
    
    // Contar actividades más nuevas que la última hora de verificación
    const newActivities = response.activities.filter(activity => {
      const activityTime = new Date(activity.createdAt || activity.timestamp || activity.date);
      return activityTime > lastCheckedTime;
    });
    
    console.log(`Found ${newActivities.length} new activities since last check`);
    
    return { 
      newActivities, 
      count: newActivities.length,
      latestActivity: newActivities.length > 0 ? newActivities[0] : null
    };
  } catch (error) {
    console.error('Error checking for new activities:', error);
    return { newActivities: [], count: 0 };
  }
};

// Función para actualizar el tiempo de última verificación
export const updateLastCheckedTime = async () => {
  try {
    const now = new Date();
    await AsyncStorage.setItem('lastActivityCheckTime', now.toISOString());
    return now;
  } catch (error) {
    console.error('Error updating last checked time:', error);
    return new Date();
  }
};

// Función para cargar el tiempo de última verificación
export const loadLastCheckedTime = async () => {
  try {
    const storedTime = await AsyncStorage.getItem('lastActivityCheckTime');
    if (storedTime) {
      return new Date(storedTime);
    } else {
      // Si no hay tiempo almacenado, usar tiempo actual
      return await updateLastCheckedTime();
    }
  } catch (error) {
    console.error('Error loading last checked time:', error);
    return new Date();
  }
};

// Send activity data to server for admin notifications
export const sendActivityToServer = async (activityData) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) return false;
    
    // Usar la ruta de actividades en lugar de la ruta de notificaciones que no existe
    const url = `${getApiUrl()}/api/activities`;
    
    console.log('Enviando actividad al servidor usando la ruta:', url);
    
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(activityData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error sending activity to server:', errorText);
      return false;
    }
    
    console.log('Activity sent to server for push notification');
    return true;
  } catch (error) {
    console.error('Error in sendActivityToServer:', error);
    return false;
  }
};

// Register for push notifications and store the token
export const registerForPushNotifications = async () => {
  try {
    console.log('Comenzando registro para notificaciones push...');
    
    // Implementación de timeout de seguridad para toda la operación
    return await Promise.race([
      _registerForPushNotificationsInternal(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout global en registro de notificaciones')), 15000);
      })
    ]).catch(error => {
      console.warn('Error con timeout en registerForPushNotifications:', error);
      // Devolver un token falso para no bloquear la inicialización
      return 'timeout-fallback-token';
    });
  } catch (error) {
    console.error('Error crítico en registerForPushNotifications:', error);
    // Devolver un token falso para no bloquear la inicialización
    return 'error-fallback-token';
  }
};

// Implementación interna del registro de notificaciones
const _registerForPushNotificationsInternal = async () => {
  try {
    // Primero, verificar si tenemos permiso con timeout
    const permissionPromise = Notifications.getPermissionsAsync();
    const permissionTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout obteniendo permisos')), 5000);
    });
    
    const { status: existingStatus } = await Promise.race([permissionPromise, permissionTimeout])
      .catch(error => {
        console.warn('Error verificando permisos:', error);
        return { status: 'unknown' };
      });
      
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      console.log('Solicitando permiso para notificaciones...');
      const requestPermissionPromise = Notifications.requestPermissionsAsync();
      const requestTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout solicitando permisos')), 5000);
      });
      
      const { status } = await Promise.race([requestPermissionPromise, requestTimeout])
        .catch(error => {
          console.warn('Error solicitando permisos:', error);
          return { status: 'unknown' };
        });
        
      finalStatus = status;
    }
    
    // Si el permiso no fue concedido, usamos un token simulado
    if (finalStatus !== 'granted') {
      console.warn('Permiso para notificaciones no concedido, usando token simulado');
      return 'no-permission-token';
    }
    
    console.log('Permiso para notificaciones concedido, obteniendo token...');
    
    // Obtener el token con manejo de errores mejorado
    let token;
    try {
      const getTokenPromise = Notifications.getExpoPushTokenAsync({
        projectId: undefined, // Usar el projectId configurado en app.json
      });
      
      const tokenTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout obteniendo token')), 8000);
      });
      
      const tokenData = await Promise.race([getTokenPromise, tokenTimeout])
        .catch(error => {
          console.error('Error obteniendo token, intentando de nuevo:', error);
          // Reintento tras un breve retraso
          return new Promise((resolve, reject) => {
            setTimeout(async () => {
              try {
                // Un último intento
                const result = await Notifications.getExpoPushTokenAsync({
                  projectId: undefined,
                });
                resolve(result);
              } catch (retryError) {
                reject(retryError);
              }
            }, 1500);
          });
        });
      
      token = tokenData?.data || null;
    } catch (tokenError) {
      console.error('Error final obteniendo token:', tokenError);
      return 'token-error-fallback';
    }
    
    if (!token) {
      console.error('No se pudo obtener un token válido');
      return 'null-token-fallback';
    }
    
    console.log('Token de notificaciones obtenido:', token);
    
    // Guardarlo en AsyncStorage para uso futuro
    try {
      await AsyncStorage.setItem('pushToken', token);
    } catch (storageError) {
      console.warn('Error guardando token en AsyncStorage:', storageError);
    }
    
    // Configuraciones especiales para Android
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      } catch (channelError) {
        console.warn('Error configurando canal de notificaciones:', channelError);
      }
    }
    
    // Realizar el resto de operaciones en segundo plano para no bloquear la inicialización
    setTimeout(async () => {
      try {
        // Enviar el token al servidor
        const serverResult = await sendPushTokenToServer(token)
          .catch(error => {
            console.error('Error enviando token al servidor:', error);
            return false;
          });
          
        console.log('Token enviado al servidor:', serverResult ? 'exitoso' : 'fallido');
        
        // Verificar admin y registrar token específico si es necesario
        const adminCheckPromise = isUserAdmin();
        const adminTimeout = new Promise((resolve) => {
          setTimeout(() => resolve(false), 5000);
        });
        
        const isAdmin = await Promise.race([adminCheckPromise, adminTimeout]);
        if (isAdmin) {
          try {
            console.log('Usuario es administrador, registrando token para notificaciones de admin');
            const adminResult = await registerAdminPushToken(token);
            if (adminResult?.success) {
              console.log('Token de administrador registrado correctamente');
            } else {
              console.error('Error registrando token de administrador:', adminResult?.error);
            }
          } catch (adminError) {
            console.warn('Error registrando token de admin:', adminError);
          }
        }
      } catch (bgError) {
        console.warn('Error en operaciones de segundo plano de notificaciones:', bgError);
      }
    }, 100);
    
    // Devolver el token inmediatamente sin esperar las operaciones de segundo plano
    return token;
  } catch (error) {
    console.error('Error en implementación interna de registro de notificaciones:', error);
    return 'critical-error-fallback-token';
  }
};

// Send push token to server
const sendPushTokenToServer = async (pushToken) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      console.warn('No hay token de autenticación para enviar push token');
      return false;
    }
    
    const url = `${getApiUrl()}/api/users/push-token`;
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ pushToken })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('Error enviando push token al servidor:', errorData);
      return false;
    }
    
    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Error en sendPushTokenToServer:', error);
    return false;
  }
};

// Registrar token de notificaciones para administradores
export const registerAdminPushToken = async (pushToken) => {
  try {
    console.log('Iniciando registro de token admin para push token:', pushToken);
    
    // Verificar si somos administrador
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
      console.warn('Intento de registrar token de admin siendo usuario normal');
      return { success: false, error: 'Solo los administradores pueden registrar tokens' };
    }
    
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      console.warn('No hay token de autenticación para registrar token de admin');
      return { success: false, error: 'No hay token de autenticación' };
    }
    
    // Obtener info del usuario para el log
    const userInfoString = await AsyncStorage.getItem('userInfo');
    if (userInfoString) {
      const userInfo = JSON.parse(userInfoString);
      console.log('Registrando token para admin:', userInfo.username, 'ID:', userInfo._id);
    }
    
    const url = `${getApiUrl()}/api/notifications/admin/register-token`;
    console.log('Intentando registrar token de admin en URL:', url);
    
    try {
      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pushToken })
      });
      
      console.log('Respuesta de registro de token admin:', response.status);
      const responseText = await response.text();
      console.log('Respuesta completa:', responseText);
      
      if (!response.ok) {
        console.error('Error al registrar token de admin. Status:', response.status, 'Error:', responseText);
        return { success: false, error: `Error HTTP ${response.status}: ${responseText}` };
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.warn('Error al parsear respuesta JSON:', parseError);
        // Si no podemos parsear la respuesta pero el status es OK, asumimos éxito
        if (response.ok) {
          return { success: true, data: { message: 'Registro exitoso (sin datos JSON)' } };
        } else {
          return { success: false, error: `Error de formato: ${responseText}` };
        }
      }
      
      return { success: true, data };
    } catch (fetchError) {
      console.error('Error de red al registrar token de admin:', fetchError);
      return { success: false, error: `Error de red: ${fetchError.message}` };
    }
  } catch (error) {
    console.error('Error en registerAdminPushToken:', error);
    return { success: false, error: error.message };
  }
};

// Función para enviar notificaciones relacionadas con actividades
export const sendActivityNotification = async (options) => {
  try {
    console.log('Enviando notificación de actividad:', options);
    
    // Verificar si el usuario tiene permiso para recibir notificaciones
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('No hay permiso para enviar notificaciones');
      return false;
    }
    
    // Para todos los usuarios, enviamos la actividad al servidor para generar notificaciones push
    // en lugar de crear notificaciones locales
    console.log('Enviando actividad al servidor para notificaciones push');
    
    // Obtener el token del usuario
    const pushToken = await registerForPushNotifications();
    if (!pushToken) {
      console.log('No se pudo obtener token de push, no se puede enviar notificación');
      return false;
    }
    
    // Obtener información del usuario
    const userInfoString = await AsyncStorage.getItem('userInfo');
    const userInfo = userInfoString ? JSON.parse(userInfoString) : {};
    
    // Enviar la actividad al servidor con el token de push
    await sendActivityToServer({
      ...options,
      pushToken,
      userId: userInfo.id,
      username: userInfo.username
    });
    
    console.log('Datos de actividad enviados al servidor para notificación push');
    return true;
  } catch (error) {
    console.error('Error al enviar notificación de actividad:', error);
    return false;
  }
};
