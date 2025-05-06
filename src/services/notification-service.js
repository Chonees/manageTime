import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from './api';
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

// Configure notifications for the app
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

// Send a local notification
export const sendLocalNotification = async (title, body, data = {}) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null, // Immediate notification
    });
    return true;
  } catch (error) {
    return false;
  }
};

// Send an activity notification to admin
export const sendAdminActivityNotification = async (activityData) => {
  try {
    // Check if current user is admin
    const userInfoString = await AsyncStorage.getItem('userInfo');
    if (!userInfoString) return false;
    
    const userInfo = JSON.parse(userInfoString);
    const isAdmin = userInfo.isAdmin === true;
    
    // If current user is admin, send a local notification
    if (isAdmin) {
      const title = activityData.title || 'New Activity';
      const body = `${activityData.username || 'A user'}: ${activityData.message || 'performed an action'}`;
      
      await sendLocalNotification(title, body, activityData);
    }
    
    // Always send to server for potential push notifications to other admin devices
    await sendActivityToServer(activityData);
    
    return true;
  } catch (error) {
    return false;
  }
};

// Send activity data to server for admin notifications
const sendActivityToServer = async (activityData) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) return false;
    
    const url = `${getApiUrl()}/api/notifications/admin`;
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
      return false;
    }
    
    return true;
  } catch (error) {
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
    try {
      const userInfoString = await AsyncStorage.getItem('user');
      if (userInfoString) {
        const userInfo = JSON.parse(userInfoString);
        if (userInfo.isAdmin) {
          console.log('Usuario es administrador, registrando token para notificaciones de admin');
          const adminResult = await registerAdminPushToken(token);
          console.log('Resultado de registro de token de admin:', adminResult);
        }
      }
    } catch (adminTokenError) {
      console.error('Error registrando token de administrador:', adminTokenError);
    }
    
    return token;
  } catch (error) {
    console.error('Error en registro de notificaciones:', error);
    return null;
  }
};

// Send push token to server
export const sendPushTokenToServer = async (pushToken) => {
  try {
    console.log('Enviando token al servidor:', pushToken);
    
    // Obtener token de autenticación
    const authToken = await AsyncStorage.getItem('token');
    if (!authToken) {
      console.error('No hay token de autenticación disponible');
      throw new Error('NO_AUTH_TOKEN');
    }
    
    // Obtener URL base de la API
    const apiUrl = getApiUrl();
    const url = `${apiUrl}/api/users/push-token`;
    
    // Preparar la solicitud
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ pushToken })
    });
    
    // Verificar respuesta
    if (!response.ok) {
      let errorText = await response.text();
      console.error('Error en respuesta del servidor:', errorText);
      throw new Error(`Error en respuesta del servidor: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Respuesta del servidor:', data);
    
    return data;
  } catch (error) {
    console.error('Error enviando token al servidor:', error);
    throw error;
  }
};

// Registrar token de notificaciones para administradores
export const registerAdminPushToken = async (pushToken) => {
  try {
    console.log('Registrando token de administrador para notificaciones:', pushToken);
    
    // Obtener token de autenticación
    const authToken = await AsyncStorage.getItem('token');
    if (!authToken) {
      console.error('No hay token de autenticación disponible');
      throw new Error('NO_AUTH_TOKEN');
    }
    
    // Comprobar si el usuario es administrador
    const userInfoString = await AsyncStorage.getItem('user');
    if (!userInfoString) {
      console.error('No hay información de usuario disponible');
      throw new Error('NO_USER_INFO');
    }
    
    const userInfo = JSON.parse(userInfoString);
    if (!userInfo.isAdmin) {
      console.log('El usuario no es administrador, no se registrará el token para notificaciones admin');
      return { success: false, reason: 'NOT_ADMIN' };
    }
    
    // Obtener URL base de la API
    const apiUrl = getApiUrl();
    const url = `${apiUrl}/api/notifications/admin/register-token`;
    
    // Preparar la solicitud
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ 
        pushToken,
        userId: userInfo._id || userInfo.id
      })
    });
    
    // Verificar respuesta
    if (!response.ok) {
      let errorText = await response.text();
      console.error('Error registrando token de administrador:', errorText);
      throw new Error(`Error en respuesta del servidor: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Token de administrador registrado exitosamente:', data);
    
    return { success: true, data };
  } catch (error) {
    console.error('Error registrando token de administrador:', error);
    return { success: false, error: error.message };
  }
};

// Send a direct test notification - this bypasses all checks and directly sends a notification
export const sendDirectTestNotification = async (title = 'Test Notification', body = 'This is a test notification') => {
  try {
    // Attempt to send direct test notification
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      try {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          return {
            success: false,
            error: 'Notification permission denied'
          };
        }
      } catch (permissionError) {
        return {
          success: false,
          error: `Permission error: ${permissionError.message}`
        };
      }
    }
    
    // Configure notification handler if needed
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    
    // Send the notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { directTest: true }
      },
      trigger: null // Send immediately
    });
    
    return {
      success: true,
      notificationId
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Function to check if notifications are working properly
export const diagnoseNotificationIssues = async () => {
  const results = {
    permissions: 'unknown',
    handlerConfigured: false,
    testNotification: 'not_attempted',
    detailedError: null
  };
  
  try {
    // Check permissions
    try {
      const { status } = await Notifications.getPermissionsAsync();
      results.permissions = status;
    } catch (permissionError) {
      results.permissions = 'error';
      results.detailedError = `Permission error: ${permissionError.message}`;
    }
    
    // Configure handler
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
      results.handlerConfigured = true;
    } catch (handlerError) {
      results.handlerConfigured = false;
      results.detailedError = `Handler error: ${handlerError.message}`;
    }
    
    // Try to send a test notification
    if (results.permissions === 'granted') {
      try {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Diagnostic Test',
            body: 'Testing if notifications are working properly',
            data: { diagnostic: true }
          },
          trigger: null
        });
        results.testNotification = 'sent';
      } catch (notificationError) {
        results.testNotification = 'failed';
        results.detailedError = `Notification error: ${notificationError.message}`;
      }
    }
    
    return results;
  } catch (error) {
    results.testNotification = 'exception';
    results.detailedError = error.message;
    return results;
  }
};
