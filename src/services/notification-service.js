import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getApiBaseUrl } from './platform-config';
// Importamos getAdminActivities desde api.js
import { getAdminActivities } from './api';

// Implementamos getApiUrl directamente aquí para evitar dependencias circulares
const getApiUrl = () => {
  return getApiBaseUrl();
};

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

    'task_complete': 'Task Completed',
    'task_delete': 'Task Deleted',
    'task_assign': 'Task Assigned',
    'location_enter': 'Location Entered',
    'location_exit': 'Location Exited',
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
    
    // Verificamos que getAdminActivities esté disponible antes de llamarla
    if (typeof getAdminActivities !== 'function') {
      console.log('getAdminActivities no está disponible en este contexto. Omitiendo verificación.');
      return { newActivities: [], count: 0 };
    }
    
    const response = await getAdminActivities({
      limit: options.limit || 50,
      sort: '-createdAt'
    });
    
    const activities = response.activities || [];
    
    // Filtrar actividades más recientes que la última verificación
    const newActivities = activities.filter(activity => {
      const activityTime = new Date(activity.createdAt);
      return activityTime > lastCheckedTime;
    });
    
    console.log(`Found ${newActivities.length} new activities since last check`);
    
    return { 
      newActivities, 
      count: newActivities.length,
      latestActivity: newActivities.length > 0 ? newActivities[0] : null
    };
  } catch (error) {
    // No mostrar error en la consola para evitar spam en los logs
    // Solo hacemos logging de que estamos manejando el error sin mostrar detalles
    console.log('La verificación de actividades se omitirá hasta que se resuelvan las dependencias.');
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
    
    // Primero, verificar si tenemos permiso
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      console.log('Solicitando permiso para notificaciones...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    // Si el permiso no fue concedido, salir
    if (finalStatus !== 'granted') {
      console.warn('Permiso para notificaciones no concedido');
      return null;
    }
    
    console.log('Permiso para notificaciones concedido, obteniendo token...');
    
    // Obtener el token - debemos tratar excepciones específicas
    let token;
    try {
      // En Android 13+ a veces hay un error "Activity not registered" que podemos reintentar
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: undefined, // Usar el projectId configurado en app.json
      }).catch(error => {
        console.error('Error inicial obteniendo token:', error);
        // Reintento tras un breve retraso
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(Notifications.getExpoPushTokenAsync({
              projectId: undefined,
            }));
          }, 1000);
        });
      });
      
      token = tokenData.data;
    } catch (tokenError) {
      console.error('Error final obteniendo token:', tokenError);
      return null;
    }
    
    if (!token) {
      console.error('No se pudo obtener un token válido');
      return null;
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
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    
    // Enviar el token al servidor para todos los usuarios
    try {
      await sendPushTokenToServer(token);
      console.log('Token enviado al servidor exitosamente');
    } catch (serverError) {
      console.error('Error enviando token al servidor:', serverError);
    }
    
    // Adicionalmente, si es administrador, registrar el token para notificaciones de administrador
    const isAdmin = await isUserAdmin();
    if (isAdmin) {
      try {
        console.log('Usuario es administrador, registrando token para notificaciones de admin');
        const adminResult = await registerAdminPushToken(token);
        if (adminResult.success) {
          console.log('Token de administrador registrado correctamente');
        } else {
          console.error('Error registrando token de administrador:', adminResult.error);
        }
      } catch (adminError) {
        console.warn('Error registrando token de admin:', adminError);
      }
    } else {
      console.log('Usuario no es administrador, no se registra token de admin');
    }
    
    return token;
  } catch (error) {
    console.error('Error general en registerForPushNotifications:', error);
    return null;
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
