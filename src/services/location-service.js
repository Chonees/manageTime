import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

import { getUserTasks, saveActivity, saveLocation } from './api';
import { Alert } from 'react-native';
import { translations } from '../context/LanguageContext';


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

// Configurar las notificaciones
export const configureNotifications = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.log(t('noNotificationPermission'));
    return false;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  return true;
};

// Enviar una notificación
const sendNotification = async (title, body) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
      },
      trigger: null, // Inmediatamente
    });
  } catch (error) {
    console.error(t('errorSendingNotification'), error);
  }
};

// Crear una actividad reciente
const createActivity = async (taskId, action) => {
  try {
    const activityData = {
      type: action === 'enter' ? 'location_enter' : 'location_exit',
      taskId,
      message: action === 'enter' 
        ? t('enteredLocation', { location: taskId })
        : t('exitedLocation', { location: taskId }),
      metadata: {
        timestamp: new Date().toISOString(),
        action
      }
    };
    
    console.log(t('registeringActivity', { action, taskId }));
    await saveActivity(activityData);
    console.log(t('activitySaved', { action, taskId }));
  } catch (error) {
    console.error(t('errorCreatingActivity'), error);
  }
};

// Comprobar si el usuario está dentro del radio de las tareas
export const checkTasksProximity = async () => {
  try {
    console.log(t('checkingTaskProximity'));
    
    // Verificar si los servicios de ubicación están habilitados
    const isLocationEnabled = await Location.hasServicesEnabledAsync();
    if (!isLocationEnabled) {
      throw new Error(t('locationServicesDisabled'));
    }
    
    // Obtener la ubicación actual
    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeout: 10000, // 10 segundos de timeout
    });
    
    const { latitude, longitude } = coords;
    console.log(t('currentLocation', { latitude, longitude }));
    
    // Obtener las tareas del usuario
    const response = await getUserTasks();
    const tasks = response || [];
    console.log(t('tasksFound', { count: tasks.length }));
    
    // Para cada tarea con ubicación, comprobar si estamos dentro del radio
    for (const task of tasks) {
      // Comprobar si la tarea tiene ubicación y radio
      if (task.location && task.location.coordinates && task.radius) {
        const taskLat = task.location.coordinates[1]; // Latitud
        const taskLng = task.location.coordinates[0]; // Longitud
        const taskRadius = task.radius; // Radio en km
        
        console.log(t('checkingTask', { 
          title: task.title,
          location: `[${taskLng}, ${taskLat}]`,
          radius: taskRadius 
        }));
        
        // Calcular la distancia a la tarea
        const distance = calculateDistance(
          latitude, 
          longitude, 
          taskLat, 
          taskLng
        );
        
        console.log(t('distanceToTask', { distance: distance.toFixed(3) }));
        
        const isInRange = distance <= taskRadius;
        const wasInRange = tasksInRange[task.id] || false;
        
        // Si entramos en el radio
        if (isInRange && !wasInRange) {
          console.log(t('enteredTaskRadius', { title: task.title }));
          sendNotification(
            t('taskNearby'),
            t('enteredTaskArea', { title: task.title })
          );
          createActivity(task.id, 'enter');
          tasksInRange[task.id] = true;
        } 
        // Si salimos del radio
        else if (!isInRange && wasInRange) {
          console.log(t('exitedTaskRadius', { title: task.title }));
          sendNotification(
            t('exitedArea'),
            t('leftTaskArea', { title: task.title })
          );
          createActivity(task.id, 'exit');
          tasksInRange[task.id] = false;
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error(t('errorCheckingProximity'), error);
    
    // Mostrar alerta al usuario según el tipo de error
    if (error.message.includes(t('locationServicesDisabled'))) {
      Alert.alert(
        t('locationServicesDisabled'),
        t('enableLocationServices'),
        [
          {
            text: t('openSettings'),
            onPress: () => Location.openSettingsAsync()
          },
          {
            text: t('cancel'),
            style: 'cancel'
          }
        ]
      );
    } else if (error.message.includes('timeout')) {
      Alert.alert(
        t('locationError'),
        t('locationTimeoutError'),
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

// Iniciar el monitoreo de ubicación
export let locationMonitoringInterval = null;
// Variable para el seguimiento de ruta
export let routeTrackingInterval = null;
export let isTracking = false;

export const startLocationMonitoring = async () => {
  try {
    // Verificar si los servicios de ubicación están habilitados
    const isLocationEnabled = await Location.hasServicesEnabledAsync();
    if (!isLocationEnabled) {
      Alert.alert(
        t('locationServicesDisabled'),
        t('enableLocationServices'),
        [
          {
            text: t('openSettings'),
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
        t('locationPermissionDenied'),
        t('locationPermissionRequired'),
        [
          {
            text: t('openSettings'),
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
    
    console.log(t('startingLocationMonitoring'));
    
    // Configurar notificaciones
    await configureNotifications();
    
    // Iniciar el monitoreo periódico
    locationMonitoringInterval = setInterval(checkTasksProximity, 30000); // Comprobar cada 30 segundos
    
    // Realizar la primera comprobación inmediatamente
    await checkTasksProximity();
    
    console.log(t('locationMonitoringStarted'));
    return true;
  } catch (error) {
    console.error(t('errorStartingMonitoring'), error);
    Alert.alert(
      t('error'),
      t('errorStartingMonitoring'),
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

// Detener el monitoreo de ubicación
export const stopLocationMonitoring = () => {
  if (locationMonitoringInterval) {
    clearInterval(locationMonitoringInterval);
    locationMonitoringInterval = null;
    console.log(t('locationMonitoringStopped'));
  }
  
  // Detener también el seguimiento de ruta si está activo
  stopRouteTracking();
  
  // Resetear el estado
  tasksInRange = {};
  
  return true;
};

// Iniciar el seguimiento de ruta (para rastrear ubicaciones durante el trabajo)
export const startRouteTracking = async () => {
  try {
    // Si ya estamos rastreando, no hacer nada
    if (isTracking) {
      console.log('El seguimiento de ruta ya está activo');
      return true;
    }
    
    // Verificar permisos
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('No se otorgaron permisos de ubicación para seguimiento');
      return false;
    }
    
    console.log('Iniciando seguimiento de ruta...');
    isTracking = true;
    
    // Ya no usamos el intervalo periódico para tracking automático
    // Solo guardamos la posición inicial
    
    // Guardar el punto inicial
    const initialLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High
    });
    await saveTrackingPoint(initialLocation.coords);
    console.log('Punto inicial de seguimiento guardado:', initialLocation.coords);
    
    return true;
  } catch (error) {
    console.error('Error al iniciar seguimiento de ruta:', error);
    return false;
  }
};

// Detener el seguimiento de ruta
export const stopRouteTracking = () => {
  if (routeTrackingInterval) {
    clearInterval(routeTrackingInterval);
    routeTrackingInterval = null;
  }
  
  if (isTracking) {
    console.log('Deteniendo seguimiento de ruta');
    isTracking = false;
    return true;
  } else {
    console.log('El seguimiento de ruta no estaba activo');
    return false;
  }
};

// Guardar un punto de seguimiento en la API
const saveTrackingPoint = async (coords) => {
  try {
    // Llamar a la API para guardar el punto de seguimiento
    await saveLocation({
      latitude: coords.latitude,
      longitude: coords.longitude,
      type: 'tracking' // Tipo específico para puntos de seguimiento
    });
    return true;
  } catch (error) {
    console.error('Error al guardar punto de seguimiento:', error);
    return false;
  }
};
