import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getUserTasks, saveActivity } from './api';
import { Alert } from 'react-native';
import { translations } from '../context/LanguageContext';
import { getApiBaseUrl, getFetchOptions, getTimeout, getPlatformConfig } from './platform-config';
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
const createActivity = async (taskId, action, coords) => {
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
      console.error(t('errorGettingUserId'), e);
    }
    
    // If no coords provided, try to get current location
    if (!coords) {
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        coords = location.coords;
      } catch (locError) {
        console.error('Error getting current location for activity:', locError);
      }
    }
    
    // Use the exact valid activity type from the backend
    const activityData = {
      // Using exact valid types from backend: 'location_enter' or 'location_exit'
      type: action === 'enter' ? 'location_enter' : 'location_exit',
      // No action field needed since type already specifies it
      taskId: taskId,
      userId: userId,
      title: t(action === 'enter' ? 'taskProximityEnter' : 'taskProximityExit'),
      description: action === 'enter' 
        ? t('enteredLocation', { location: taskId })
        : t('exitedLocation', { location: taskId }),
      message: action === 'enter' 
        ? t('enteredLocation', { location: taskId })
        : t('exitedLocation', { location: taskId }),
      metadata: {
        timestamp: new Date().toISOString(),
        action,
        location: coords ? {
          type: 'Point',
          coordinates: [coords.longitude, coords.latitude]
        } : null
      }
    };
    
    console.log(t('registeringActivity', { action, taskId }));
    console.log('Activity data:', JSON.stringify(activityData));
    
    // Save the activity
    await saveActivity(activityData);
    console.log(t('activitySaved', { action, taskId }));
    
    // Also save the location point to location history if we have coordinates
    if (coords) {
      try {
        await saveTrackingPoint({
          latitude: coords.latitude,
          longitude: coords.longitude,
          type: 'tracking',
          description: action === 'enter' 
            ? `Entered task area: ${taskId}`
            : `Exited task area: ${taskId}`
        });
        console.log('Location point saved for activity:', action);
      } catch (locationError) {
        console.error('Error saving location point:', locationError);
      }
    }
  } catch (error) {
    console.error(t('errorCreatingActivity'), error);
  }
};

// Comprobar si el usuario está dentro del radio de las tareas
export const checkTasksProximity = async () => {
  try {
    console.log(t('checkingTaskProximity'));
    
    // Verificar si los servicios de ubicación están habilitados
    let isLocationEnabled;
    try {
      isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        console.log('Location services are disabled, showing alert to enable them');
        throw new Error(t('locationServicesDisabled'));
      }
    } catch (error) {
      console.error('Error checking location services:', error);
      throw error;
    }
    
    // Obtener la ubicación actual con múltiples intentos y precisiones diferentes
    let coords;
    try {
      // First attempt with high accuracy
      console.log('Attempting to get location with high accuracy...');
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeout: 10000
        });
        coords = location.coords;
        console.log('Successfully got high accuracy location:', coords);
      } catch (highAccError) {
        console.error('High accuracy location failed:', highAccError);
        
        // Second attempt with balanced accuracy
        console.log('Intentando con precisión media...');
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeout: 15000
          });
          coords = location.coords;
          console.log('Successfully got balanced accuracy location:', coords);
        } catch (balancedAccError) {
          console.error('Balanced accuracy location failed:', balancedAccError);
          
          // Last attempt with low accuracy
          console.log('Intentando con precisión menor...');
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
            timeout: 20000
          });
          coords = location.coords;
          console.log('Successfully got low accuracy location:', coords);
        }
      }
    } catch (locationError) {
      console.error('Error en fallback de ubicación:', locationError);
      
      // Try foreground location service as last resort
      try {
        console.log('Configurando watch position con opciones:', {
          accuracy: 3, // low precision
          distanceInterval: 5,
          timeInterval: 5000,
          enableHighAccuracy: true,
          distanceFilter: 5, 
          fastestInterval: 5000,
          interval: 10000,
          maxWaitTime: 15000,
          showLocationDialog: true,
          forceRequestLocation: true
        });
        
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
              console.log('Got location from watchPosition:', position.coords);
              processLocationUpdate(position.coords);
              watchId.then(subscription => subscription.remove());
              resolve(true);
            }
          ).catch(error => {
            console.error('WatchPosition failed:', error);
            reject(error);
          });
          
          // Timeout after 20 seconds
          setTimeout(() => {
            watchId.then(subscription => subscription.remove());
            reject(new Error('Location watch timeout'));
          }, 20000);
        });
      } catch (watchError) {
        console.error('Watch position error:', watchError);
        throw watchError;
      }
    }
    
    // Process the location update now that we have coordinates
    return processLocationUpdate(coords);
    
  } catch (error) {
    console.error(t('errorCheckingProximity'), error);
    
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
    console.log(t('currentLocation', { latitude, longitude }));
    
    // Save the successful location for fallback use
    try {
      await AsyncStorage.setItem('lastKnownLocation', JSON.stringify({
        coords,
        timestamp: new Date().toISOString()
      }));
    } catch (storageError) {
      console.warn('Could not save last known location:', storageError);
    }
    
    // Obtener las tareas del usuario
    const response = await getUserTasks();
    const tasks = response || [];
    console.log(t('tasksFound', { count: tasks.length }));
    
    // Para cada tarea con ubicación, comprobar si estamos dentro del radio
    for (const task of tasks) {
      // Skip completed tasks
      if (task.completed) {
        console.log(`Skipping completed task: ${task.title}`);
        continue;
      }

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
        
        console.log(t('distanceToTask', { 
          km: distance.toFixed(6),
          meters: (distance * 1000).toFixed(2) 
        }));
        
        console.log(`Task distance details: 
          - Task ID: ${task._id}
          - Task title: ${task.title}
          - Task coordinates: [${taskLat}, ${taskLng}]
          - User coordinates: [${latitude}, ${longitude}]
          - Distance: ${distance.toFixed(3)} km (${(distance * 1000).toFixed(0)} meters)
          - Task radius: ${taskRadius} km (${taskRadius * 1000} meters)
          - Within radius: ${distance <= taskRadius ? 'YES' : 'NO'}
        `);
        
        const isInRange = distance <= taskRadius; // Both in km
        const wasInRange = tasksInRange[task._id] || false;
        
        // Si entramos en el radio
        if (isInRange && !wasInRange) {
          console.log(t('enteredTaskRadius', { title: task.title }));
          sendNotification(
            t('taskNearby'),
            t('enteredTaskArea', { title: task.title })
          );
          createActivity(task._id, 'enter', coords);
          tasksInRange[task._id] = true;
        } 
        // Si salimos del radio
        else if (!isInRange && wasInRange) {
          console.log(t('exitedTaskRadius', { title: task.title }));
          sendNotification(
            t('exitedArea'),
            t('leftTaskArea', { title: task.title })
          );
          createActivity(task._id, 'exit', coords);
          tasksInRange[task._id] = false;
        }
        // Si estamos fuera del radio
        else if (!isInRange) {
          const distanceMeters = (distance * 1000).toFixed(0);
          const radiusMeters = (taskRadius * 1000).toFixed(0);
          console.log(`OUTSIDE RADIUS: ${distanceMeters}m to task '${task.title}' (radius: ${radiusMeters}m)`);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error processing location update:', error);
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
        console.log('Using last known location from storage:', lastLocation.coords);
        processLocationUpdate(lastLocation.coords);
        return true;
      } else {
        console.log('Last known location too old:', ageInMinutes.toFixed(1), 'minutes');
        Alert.alert(
          t('locationError'),
          t('lastLocationTooOld')
        );
      }
    } else {
      console.log('No last known location found in storage');
      Alert.alert(
        t('locationError'),
        t('noLastLocation')
      );
    }
  } catch (error) {
    console.error('Error using last known location:', error);
  }
  return false;
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
    
    console.log(t('starting Location Monitoring'));
    
    // Configurar notificaciones
    await configureNotifications();
    
    // Iniciar el monitoreo periódico
    locationMonitoringInterval = setInterval(checkTasksProximity, 30000); // Comprobar cada 30 segundos
    
    // Realizar la primera comprobación inmediatamente
    await checkTasksProximity();
    
    console.log(t('location Monitoring Started'));
    return true;
  } catch (error) {
    console.error(t('error Starting Monitoring'), error);
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

// Detener el monitoreo de ubicación
export const stopLocationMonitoring = () => {
  if (locationMonitoringInterval) {
    clearInterval(locationMonitoringInterval);
    locationMonitoringInterval = null;
    console.log(t('location Monitoring Stopped'));
  }
  
  // Detener también el seguimiento de ruta si está activo
  stopRouteTracking();
  
  // Resetear el estado
  tasksInRange = {};
  
  return true;
};

// Iniciar el seguimiento de ruta (tracking de ubicación continuo)
export const startRouteTracking = async () => {
  if (isTracking) {
    console.log('Location tracking is already active');
    return true;
  }
  
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('No se otorgaron permisos de ubicación para seguimiento');
      return false;
    }
    
    console.log('Iniciando seguimiento de ruta...');
    isTracking = true;
    
    // Get initial location
    const initialLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High
    });
    
    // Save initial tracking point
    const saved = await saveTrackingPoint(initialLocation.coords);
    if (!saved) {
      console.error('Failed to save initial tracking point');
      return false;
    }
    
    // Start periodic tracking
    routeTrackingInterval = setInterval(async () => {
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeInterval: 30000,
          distanceInterval: 5
        });
        
        await saveTrackingPoint(location.coords);
      } catch (error) {
        console.error('Error al guardar punto de seguimiento:', error);
      }
    }, 30000); // Every 30 seconds
    
    return true;
  } catch (error) {
    console.error('Error al iniciar seguimiento de ruta:', error);
    isTracking = false;
    return false;
  }
};

// Detener el seguimiento de ruta
export const stopRouteTracking = () => {
  if (routeTrackingInterval) {
    clearInterval(routeTrackingInterval);
    routeTrackingInterval = null;
    isTracking = false;
    console.log('Seguimiento de ruta detenido');
  }
  return true;
};

// Function to save a tracking point
const saveTrackingPoint = async (coords) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      return false;
    }

    const response = await fetch(`${API_URL}/tracking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        latitude: coords.latitude,
        longitude: coords.longitude,
        timestamp: new Date().toISOString(),
        description: 'Location tracking point'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error response:', errorData);
      throw new Error(`Error al guardar punto de seguimiento: ${response.status} ${errorData.message || ''}`);
    }

    const responseData = await response.json();
    console.log('Tracking point saved successfully:', responseData);
    return true;
  } catch (error) {
    console.error('Error al guardar punto de seguimiento:', error);
    return false;
  }
};

