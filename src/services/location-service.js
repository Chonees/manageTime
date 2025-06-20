import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getUserTasks, saveActivity, saveLocation } from './api';
import { Alert } from 'react-native';
import { translations } from '../context/LanguageContext';
import { getApiBaseUrl, getFetchOptions, getTimeout, getPlatformConfig } from './platform-config';
import { sendActivityNotification } from './notification-service';

export const API_URL = getApiBaseUrl();
// Estado para manejar las tareas que actualmente estamos dentro de su radio
let tasksInRange = {};
let currentLanguage = 'es'; // Default language

// Set the current language
export const setLanguage = (lang) => {
  currentLanguage = lang;
};

// Get translation
const t = (key, params = {}) => {
  let translation = translations[currentLanguage][key] || key;
  
  // Replace parameters in the translation string
  Object.entries(params).forEach(([param, value]) => {
    translation = translation.replace(`{{${param}}}`, value);
  });
  
  return translation;
};

// Calcular la distancia entre dos puntos utilizando la fórmula de Haversine
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radio de la tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distancia en km
  return d;
};

const toRad = (value) => {
  return value * Math.PI / 180;
};

// Enviar una notificación utilizando el servicio centralizado
const sendNotification = async (title, body) => {
  try {
    console.log('Intentando enviar notificación desde location-service:', title, body);
    // Usamos sendActivityNotification en lugar de sendLocalNotification
    await sendActivityNotification({
      title,
      body,
      data: { source: 'location-service' }
    });
  } catch (error) {
    // Manejo silencioso de errores
    console.error('Error sending notification from location service:', error);
  }
};

// Crear una actividad reciente
const createActivity = async (taskId, action, coords, taskTitle = null) => {
  try {
    // Get userId from saved user info
    let userId = null;
    try {
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr);
        userId = userInfo._id;
      }
    } catch (e) {
      // Manejo silencioso de errores
    }
    
    // If no coords provided, try to get current location
    if (!coords) {
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        coords = location.coords;
      } catch (locError) {
        // Manejo silencioso de errores
      }
    }
    
    // Use the exact valid activity type from the backend
    const activityData = {
      // Usar un tipo de actividad genérico que el backend probablemente reconozca
      type: 'task_activity',
      // Usar subtype para indicar la acción específica
      subtype: action === 'enter' ? 'task_enter' : 'task_exit',
      taskId: taskId,
      userId: userId,
      // Títulos claros y descriptivos 
      title: action === 'enter' 
        ? `${t('userEntered')} "${taskTitle || 'tarea'}"` 
        : `${t('userExited')} "${taskTitle || 'tarea'}"`,
      // Mensajes específicos para cada acción
      message: action === 'enter' 
        ? `${t('userEntered')} "${taskTitle || taskId}"`
        : `${t('userExited')} "${taskTitle || taskId}"`,
      description: action === 'enter' 
        ? `${t('userEnteredDescription', { location: taskTitle || taskId })}`
        : `${t('userExitedDescription', { location: taskTitle || taskId })}`,
      metadata: {
        timestamp: new Date().toISOString(),
        action,
        taskTitle: taskTitle, // Guardar explícitamente el título de la tarea en los metadatos
        locationName: taskTitle, // Usar el título de la tarea como nombre de ubicación
        // Añadir información específica del tipo de acción para que el backend lo interprete correctamente
        actionType: action === 'enter' ? 'entered_task_area' : 'exited_task_area',
        location: coords ? {
          type: 'Point',
          coordinates: [coords.longitude, coords.latitude]
        } : null
      }
    };
    
    // Save the activity
    await saveActivity(activityData);
  } catch (error) {
    // Manejo silencioso de errores
  }
};

// Comprobar si el usuario está dentro del radio de las tareas
export const checkTasksProximity = async () => {
  try {
    // Verificar si los servicios de ubicación están habilitados
    let isLocationEnabled;
    try {
      isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        throw new Error(t('locationServicesDisabled'));
      }
    } catch (error) {
      throw error;
    }
    
    // Obtener la ubicación actual con múltiples intentos y precisiones diferentes
    let coords;
    try {
      // First attempt with high accuracy
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeout: 10000
        });
        coords = location.coords;
      } catch (highAccError) {
        // Second attempt with balanced accuracy
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeout: 15000
          });
          coords = location.coords;
        } catch (balancedAccError) {
          // Last attempt with low accuracy
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
            timeout: 20000
          });
          coords = location.coords;
        }
      }
    } catch (locationError) {
      // Try foreground location service as last resort
      try {
        const permStatus = await Location.requestForegroundPermissionsAsync();
        if (permStatus.status !== 'granted') {
          throw new Error('Location permission not granted');
        }
        
        // Final attempt using watchPosition
        return new Promise((resolve, reject) => {
          const watchId = Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Low,
              distanceInterval: 10,
              timeInterval: 5000,
            },
            position => {
              // Got location update, process it
              processLocationUpdate(position.coords);
              watchId.then(subscription => subscription.remove());
              resolve(true);
            }
          ).catch(error => {
            reject(error);
          });
          
          // Timeout after 20 seconds
          setTimeout(() => {
            watchId.then(subscription => subscription.remove());
            reject(new Error('Location watch timeout'));
          }, 20000);
        });
      } catch (watchError) {
        throw watchError;
      }
    }
    
    // Process the location update now that we have coordinates
    return processLocationUpdate(coords);
    
  } catch (error) {
    // Mostrar alerta al usuario según el tipo de error
    if (error.message.includes('location') || error.message.includes('Location')) {
      Alert.alert(
        t('locationError'),
        t('locationServicesHelp'),
        [
          {
            text: t('openSettings'),
            onPress: () => Location.openSettingsAsync()
          },
          {
            text: t('useLastKnownLocation'),
            onPress: () => tryUseLastKnownLocation()
          },
          {
            text: t('cancel'),
            style: 'cancel'
          }
        ]
      );
    } else {
      Alert.alert(
        t('locationError'),
        t('locationErrorGeneric'),
        [
          {
            text: t('retry'),
            onPress: () => checkTasksProximity()
          },
          {
            text: t('cancel'),
            style: 'cancel'
          }
        ]
      );
    }
    
    return false;
  }
};

// New function to process location updates
const processLocationUpdate = async (coords) => {
  try {
    const { latitude, longitude } = coords;
    
    // Save the successful location for fallback use
    try {
      await AsyncStorage.setItem('lastKnownLocation', JSON.stringify({
        coords,
        timestamp: new Date().toISOString()
      }));
    } catch (storageError) {
      // Manejo silencioso de errores
    }
    
    // Obtener las tareas del usuario
    const response = await getUserTasks();
    const tasks = response || [];
    
    // Para cada tarea con ubicación, comprobar si estamos dentro del radio
    for (const task of tasks) {
      // Skip completed tasks
      if (task.completed) {
        continue;
      }

      // Comprobar si la tarea tiene ubicación y radio
      if (task.location && task.location.coordinates && task.radius) {
        const taskLat = task.location.coordinates[1]; // Latitud
        const taskLng = task.location.coordinates[0]; // Longitud
        const taskRadius = task.radius; // Radio en km
        
        // Calcular la distancia a la tarea
        const distance = calculateDistance(
          latitude, 
          longitude, 
          taskLat, 
          taskLng
        );
        
        const isInRange = distance <= taskRadius; // Both in km
        const wasInRange = tasksInRange[task._id] || false;
        
        // Si entramos en el radio
        if (isInRange && !wasInRange) {
          sendNotification(
            t('taskNearby'),
            t('enteredTaskArea', { title: task.title })
          );
          // Pasar también el título de la tarea al crear la actividad
          createActivity(task._id, 'enter', coords, task.title);
          tasksInRange[task._id] = true;
        } 
        // Si salimos del radio
        else if (!isInRange && wasInRange) {
          sendNotification(
            t('exitedArea'),
            t('leftTaskArea', { title: task.title })
          );
          // Pasar también el título de la tarea al crear la actividad
          createActivity(task._id, 'exit', coords, task.title);
          tasksInRange[task._id] = false;
        }
      }
    }
    
    return true;
  } catch (error) {
    throw error;
  }
};

// New function to try using last known location
const tryUseLastKnownLocation = async () => {
  try {
    const lastLocationString = await AsyncStorage.getItem('lastKnownLocation');
    if (lastLocationString) {
      const lastLocation = JSON.parse(lastLocationString);
      const timestamp = new Date(lastLocation.timestamp);
      const now = new Date();
      const ageInMinutes = (now - timestamp) / (1000 * 60);
      
      if (ageInMinutes < 60) { // Use if less than 1 hour old
        processLocationUpdate(lastLocation.coords);
        return true;
      } else {
        Alert.alert(
          t('locationError'),
          t('lastLocationTooOld')
        );
      }
    } else {
      Alert.alert(
        t('locationError'),
        t('noLastLocation')
      );
    }
  } catch (error) {
    // Manejo silencioso de errores
  }
  return false;
};

// Iniciar el monitoreo de ubicación
export let locationMonitoringInterval = null;

// Detener monitoreo de ubicación
export const stopLocationMonitoring = () => {
  // Detener monitoreo constante
  if (locationMonitoringInterval) {
    clearInterval(locationMonitoringInterval);
    locationMonitoringInterval = null;
  }
  
  // Resetear el estado
  tasksInRange = {};
  
  return true;
};

// Iniciar el monitoreo de ubicación
export const startLocationMonitoring = async () => {
  try {
    // Verificar si los servicios de ubicación están habilitados
    const isLocationEnabled = await Location.hasServicesEnabledAsync();
    if (!isLocationEnabled) {
      Alert.alert(
        t('location Services Disabled'),
        t('enable Location Services'),
        [
          {
            text: t('open Settings'),
            onPress: () => Location.openSettingsAsync()
          },
          {
            text: t('cancel'),
            style: 'cancel'
          }
        ]
      );
      return false;
    }

    // Solicitar permisos de ubicación
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        t('location Permission Denied'),
        t('location Permission Required'),
        [
          {
            text: t('open Settings'),
            onPress: () => Location.openSettingsAsync()
          },
          {
            text: t('cancel'),
            style: 'cancel'
          }
        ]
      );
      return false;
    }
    
    // Iniciar el monitoreo periódico
    locationMonitoringInterval = setInterval(checkTasksProximity, 20000); // Comprobar cada 20 segundos
    
    // Realizar la primera comprobación inmediatamente
    await checkTasksProximity();
    
    return true;
  } catch (error) {
    Alert.alert(
      t('error'),
      t('error Starting Monitoring'),
      [
        {
          text: t('retry'),
          onPress: () => startLocationMonitoring()
        },
        {
          text: t('cancel'),
          style: 'cancel'
        }
      ]
    );
    return false;
  }
};
