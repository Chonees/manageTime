import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { getUserTasks, saveActivity } from './api';

// Estado para manejar las tareas que actualmente estamos dentro de su radio
let tasksInRange = {};

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
    console.log('No se otorgaron permisos de notificación');
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
    console.error('Error al enviar notificación:', error);
  }
};

// Crear una actividad reciente
const createActivity = async (taskId, action) => {
  try {
    const activityData = {
      type: action === 'enter' ? 'location_enter' : 'location_exit',
      taskId,
      message: action === 'enter' 
        ? 'Has entrado en el área de una tarea' 
        : 'Has salido del área de una tarea',
      metadata: {
        timestamp: new Date().toISOString(),
        action
      }
    };
    
    console.log(`Registrando actividad: ${action} para tarea ${taskId}`);
    
    // Ahora que tenemos la ruta en el backend, volvemos a activar la llamada
    await saveActivity(activityData);
    console.log(`Actividad guardada: ${action} para tarea ${taskId}`);
  } catch (error) {
    console.error('Error al crear actividad:', error);
  }
};

// Comprobar si el usuario está dentro del radio de las tareas
export const checkTasksProximity = async () => {
  try {
    console.log('Verificando proximidad a tareas...');
    
    // Obtener la ubicación actual
    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    
    const { latitude, longitude } = coords;
    console.log(`Ubicación actual: ${latitude}, ${longitude}`);
    
    // Obtener las tareas del usuario
    const response = await getUserTasks();
    const tasks = response || [];
    console.log(`Se encontraron ${tasks.length} tareas para verificar`);
    
    // Para cada tarea con ubicación, comprobar si estamos dentro del radio
    for (const task of tasks) {
      // Comprobar si la tarea tiene ubicación y radio
      if (task.location && task.location.coordinates && task.radius) {
        const taskLat = task.location.coordinates[1]; // Latitud
        const taskLng = task.location.coordinates[0]; // Longitud
        const taskRadius = task.radius; // Radio en km
        
        console.log(`Comprobando tarea ${task.title}: ubicación [${taskLng}, ${taskLat}], radio ${taskRadius}km`);
        
        // Calcular la distancia a la tarea
        const distance = calculateDistance(
          latitude, 
          longitude, 
          taskLat, 
          taskLng
        );
        
        console.log(`Distancia a la tarea: ${distance.toFixed(3)}km`);
        
        const isInRange = distance <= taskRadius;
        const wasInRange = tasksInRange[task.id] || false;
        
        // Si entramos en el radio
        if (isInRange && !wasInRange) {
          console.log(`Entraste en el radio de la tarea: ${task.title}`);
          sendNotification(
            '¡Tarea cercana!', 
            `Has entrado en el área de la tarea: ${task.title}`
          );
          createActivity(task.id, 'enter');
          tasksInRange[task.id] = true;
        } 
        // Si salimos del radio
        else if (!isInRange && wasInRange) {
          console.log(`Saliste del radio de la tarea: ${task.title}`);
          sendNotification(
            'Has salido del área', 
            `Ya no estás en el área de la tarea: ${task.title}`
          );
          createActivity(task.id, 'exit');
          tasksInRange[task.id] = false;
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error al comprobar proximidad de tareas:', error);
    return false;
  }
};

// Iniciar el monitoreo de ubicación
export let locationMonitoringInterval = null;

export const startLocationMonitoring = async () => {
  // Solicitar permisos de ubicación
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    console.log('No se otorgaron permisos de ubicación');
    return false;
  }
  
  console.log('Iniciando monitoreo de ubicación...');
  
  // Configurar notificaciones
  await configureNotifications();
  
  // Iniciar el monitoreo periódico
  locationMonitoringInterval = setInterval(checkTasksProximity, 30000); // Comprobar cada 30 segundos
  
  // Realizar la primera comprobación inmediatamente
  await checkTasksProximity();
  
  console.log('Monitoreo de ubicación iniciado correctamente');
  return true;
};

// Detener el monitoreo de ubicación
export const stopLocationMonitoring = () => {
  if (locationMonitoringInterval) {
    clearInterval(locationMonitoringInterval);
    locationMonitoringInterval = null;
    console.log('Monitoreo de ubicación detenido');
  }
  
  // Resetear el estado
  tasksInRange = {};
  
  return true;
};
