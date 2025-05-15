import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  StatusBar,
  SafeAreaView,
  Linking,
  Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import * as api from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VoiceListener from '../components/VoiceListener'; // Importar el componente de escucha de voz
import TaskConfirmationModal from '../components/TaskConfirmationModal'; // Importar modal de confirmación

const TaskDetailsScreen = ({ route, navigation }) => {
  const { taskId } = route.params;
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignedUser, setAssignedUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isWithinRadius, setIsWithinRadius] = useState(false);
  const [taskStarted, setTaskStarted] = useState(false);
  const [locationWatcher, setLocationWatcher] = useState(null);
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [activityInput, setActivityInput] = useState('');
  const [isSubmittingActivity, setIsSubmittingActivity] = useState(false);
  const [taskActivities, setTaskActivities] = useState([]);
  const [spokenKeywords, setSpokenKeywords] = useState([]); // Nuevo estado para palabras clave ya pronunciadas
  const [remainingTime, setRemainingTime] = useState(null); // Estado para seguir el tiempo restante
  const [showTaskConfirmation, setShowTaskConfirmation] = useState(false); // Estado para mostrar el modal de confirmación
  const [confirmationLoading, setConfirmationLoading] = useState(false); // Estado para indicar carga durante la confirmación
  const [hasShownConfirmation, setHasShownConfirmation] = useState(false); // Estado para controlar si ya se mostró la confirmación
  const timerIntervalRef = React.useRef(null); // Referencia para el intervalo del timer

  useEffect(() => {
    loadTaskDetails();

    return () => {
      if (locationSubscription) {
        // En versiones recientes de Expo Location, la suscripción tiene un método remove
        locationSubscription.remove();
      }
      
      // Limpiar el intervalo del temporizador cuando el componente se desmonte
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [taskId]);

  // Efecto para iniciar el temporizador solo cuando la tarea está aceptada o en progreso
  useEffect(() => {
    if (task) {
      startLocationTracking();
      
      // Mostrar el temporizador si la tarea tiene límite de tiempo
      if (task.timeLimit) {
        // Si la tarea está aceptada o en progreso y tiene timeLimitSet, iniciar el timer
        if ((task.status === 'accepted' || task.status === 'in-progress' || task.status === 'in_progress') && 
             task.timeLimitSet) {
          console.log(`Iniciando temporizador para tarea ${task._id} con estado ${task.status}`);
          startTaskTimer();
          
          // Si la tarea está en progreso, establecer taskStarted en true
          if ((task.status === 'in-progress' || task.status === 'in_progress') && !taskStarted) {
            setTaskStarted(true);
          }
        } 
        // Si solo tiene timeLimit pero aún no está aceptada o no tiene timeLimitSet, mostrar el timer estático
        else {
          // Mostrar el tiempo completo (sin contar)
          const timeLimitMs = task.timeLimit * 60 * 1000; // Convertir minutos a milisegundos
          setRemainingTime(timeLimitMs);
        }
      }
    }
  }, [task]);

  // Efecto para mostrar automáticamente el modal de confirmación
  useEffect(() => {
    // Mostrar automáticamente el modal de confirmación para usuarios normales
    // cuando se carga una tarea que no está en progreso ni completada
    if (
      task && 
      !user.isAdmin && 
      !hasShownConfirmation && 
      task.status === 'pending' && 
      !task.completed
    ) {
      // Pequeño delay para asegurar que la interfaz ya está renderizada
      const timer = setTimeout(() => {
        setShowTaskConfirmation(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [task, user, hasShownConfirmation]);

  // Efecto para comprobar si esta tarea ya ha sido confirmada anteriormente
  useEffect(() => {
    // Función para verificar si esta tarea ya ha sido confirmada
    const checkTaskConfirmation = async () => {
      try {
        if (taskId) {
          // Obtener la lista de tareas confirmadas de AsyncStorage
          const confirmedTasksString = await AsyncStorage.getItem('confirmedTasks');
          const confirmedTasks = confirmedTasksString ? JSON.parse(confirmedTasksString) : [];
          
          // Verificar si esta tarea está en la lista
          if (confirmedTasks.includes(taskId)) {
            console.log(`Tarea ${taskId} ya fue confirmada anteriormente`);
            setHasShownConfirmation(true);
          }
        }
      } catch (error) {
        console.error('Error verificando estado de confirmación de tarea:', error);
      }
    };
    
    checkTaskConfirmation();
  }, [taskId]);

  // Función para iniciar el temporizador de la tarea
  const startTaskTimer = () => {
    if (!task) {
      console.log("No se puede iniciar el temporizador: tarea no disponible");
      return;
    }
    
    // Verificar si la tarea tiene tiempo límite (puede ser número o string)
    const timeLimitValue = task.timeLimit ? 
      (typeof task.timeLimit === 'string' ? Number(task.timeLimit) : task.timeLimit) : null;
    
    if (!timeLimitValue) {
      console.log("No se encontró campo timeLimit en la tarea");
      return;
    }
    
    // Verificar si hay una fecha de inicio del temporizador
    if (!task.timeLimitSet) {
      console.log("No se encontró fecha de inicio del temporizador");
      return;
    }
    
    console.log(`Iniciando temporizador: Límite de ${timeLimitValue} minutos, establecido en ${task.timeLimitSet}`);
    
    // Limpiar cualquier temporizador existente
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    // Calcular el tiempo restante en milisegundos
    const timeLimitMs = timeLimitValue * 60 * 1000; // Convertir minutos a milisegundos
    const startTime = new Date(task.timeLimitSet).getTime();
    const endTime = startTime + timeLimitMs;
    const currentTime = new Date().getTime();
    
    console.log(`Temporizador: Inicio ${new Date(startTime).toLocaleString()}, Fin ${new Date(endTime).toLocaleString()}, Ahora ${new Date(currentTime).toLocaleString()}`);
    
    // Si ya se pasó el tiempo límite, retirar la tarea inmediatamente
    if (currentTime >= endTime) {
      console.log("El tiempo ya expiró, retirando tarea...");
      handleTimeExpired();
      return;
    }
    
    // Establecer el tiempo restante inicial
    const initialRemainingTime = endTime - currentTime;
    console.log(`Tiempo restante inicial: ${formatRemainingTime(initialRemainingTime)}`);
    setRemainingTime(initialRemainingTime);
    
    // Actualizar el tiempo restante cada segundo
    timerIntervalRef.current = setInterval(() => {
      const now = new Date().getTime();
      const timeLeft = endTime - now;
      
      if (timeLeft <= 0) {
        // Tiempo agotado
        clearInterval(timerIntervalRef.current);
        setRemainingTime(0);
        handleTimeExpired();
      } else {
        setRemainingTime(timeLeft);
      }
    }, 1000);
  };
  
  // Función para manejar cuando el tiempo se agota
  const handleTimeExpired = async () => {
    try {
      // Notificar al usuario que el tiempo se ha agotado
      Alert.alert(
        t('timeExpired') || 'Tiempo Agotado',
        t('taskRemovedDueToTimeLimit') || 'Esta tarea ha sido eliminada porque se acabó el tiempo asignado.',
        [{ text: t('ok') || 'OK' }]
      );
      
      // Eliminar la tarea directamente
      await api.deleteTask(taskId);
      
      // Regresar a la pantalla anterior
      navigation.goBack();
    } catch (error) {
      console.error('Error al eliminar tarea por tiempo expirado:', error);
    }
  };
  
  // Función para formatear el tiempo restante en formato hh:mm:ss
  const formatRemainingTime = (ms) => {
    if (ms === null) return '';
    
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const startLocationTracking = async () => {
    try {
      // Verify task has location data before starting tracking
      if (!task?.location?.coordinates || task.location.coordinates.length !== 2) {
        console.error('Cannot start location tracking: Task is missing valid coordinates');
        Alert.alert(
          t('error'),
          t('taskMissingLocation'),
          [{ text: t('ok') }]
        );
        return;
      }
      
      console.log(t('startingLocationTracking'));
      
      // Request permissions first
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error(t('locationPermissionDenied'));
        Alert.alert(
          t('error'),
          t('locationPermissionDenied'),
          [{ text: t('ok') }]
        );
        return;
      }
      
      // Try multiple approaches to get location
      let initialLocation = null;
      
      try {
        // First try with high accuracy
        console.log('Trying high accuracy location...');
        initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
          maximumAge: 1000,
          timeout: 10000
        });
        console.log('Successfully got high accuracy location');
      } catch (highAccError) {
        console.error('High accuracy location failed:', highAccError);
        
        try {
          // Try with balanced accuracy
          console.log('Trying balanced accuracy location...');
          initialLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            maximumAge: 5000,
            timeout: 15000
          });
          console.log('Successfully got balanced accuracy location');
        } catch (balancedError) {
          console.error('Balanced accuracy location failed:', balancedError);
          
          try {
            // Try with low accuracy
            console.log('Trying low accuracy location...');
            initialLocation = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Low,
              maximumAge: 10000,
              timeout: 20000
            });
            console.log('Successfully got low accuracy location');
          } catch (lowAccError) {
            console.error('All location attempts failed:', lowAccError);
            
            // Try to use device's last known location
            try {
              console.log('Trying to get last known position from device...');
              const lastKnownPosition = await Location.getLastKnownPositionAsync();
              if (lastKnownPosition) {
                console.log('Using last known position from device');
                initialLocation = lastKnownPosition;
              } else {
                console.log('No last known position available on device');
                throw new Error('No last known position available');
              }
            } catch (lastKnownError) {
              console.error('Failed to get last known position:', lastKnownError);
              
              // Last resort - try to use stored location from AsyncStorage
              try {
                console.log('Trying to retrieve stored location from AsyncStorage...');
                const storedLocationString = await AsyncStorage.getItem('lastKnownLocation');
                if (storedLocationString) {
                  const storedLocation = JSON.parse(storedLocationString);
                  console.log('Using stored location:', storedLocation);
                  
                  // Create a location object in the format expected
                  initialLocation = {
                    coords: storedLocation.coords,
                    timestamp: new Date(storedLocation.timestamp).getTime()
                  };
                }
              } catch (storageError) {
                console.error('Failed to retrieve stored location:', storageError);
              }
            }
          }
        }
      }
      
      if (initialLocation) {
      console.log(t('initialLocationReading'));
      setUserLocation(initialLocation.coords);
      checkIfWithinTaskRadius(initialLocation.coords);
      
        // Store successful location for future use
        try {
          await AsyncStorage.setItem('lastKnownLocation', JSON.stringify({
            coords: initialLocation.coords,
            timestamp: new Date().toISOString()
          }));
        } catch (storageError) {
          console.warn('Could not save last known location:', storageError);
        }
      } else {
        console.error('Failed to get any location');
        Alert.alert(
          t('error'),
          t('locationServicesHelp'),
          [{ text: t('ok') }]
        );
      }
      
      // Set up continuous tracking with more robust options
      console.log(t('settingUpLocationTracking'));
      
      const watchOptions = {
          accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,
        timeInterval: 3000,
        mayShowUserSettingsDialog: true
      };
      
      console.log('Watch position options:', watchOptions);
      
      const subscription = await Location.watchPositionAsync(
        watchOptions,
        (locationUpdate) => {
          console.log(t('locationUpdateReceived'));
          console.log(t('locationCoordinates', {
            lat: locationUpdate.coords.latitude.toFixed(6),
            lng: locationUpdate.coords.longitude.toFixed(6),
            accuracy: Math.round(locationUpdate.coords.accuracy)
          }));
          
          setUserLocation(locationUpdate.coords);
          checkIfWithinTaskRadius(locationUpdate.coords);
          
          // Update stored location
          try {
            AsyncStorage.setItem('lastKnownLocation', JSON.stringify({
              coords: locationUpdate.coords,
              timestamp: new Date().toISOString()
            }));
          } catch (storageError) {
            console.warn('Could not update stored location:', storageError);
          }
        }
      );
      
      setIsLocationTracking(true);
      setLocationSubscription(subscription);
      console.log(t('locationTrackingStarted'));
    } catch (error) {
      console.error(`${t('locationTrackingError').replace('${error}', error.message)}`);
      Alert.alert(
        t('error'),
        t('locationTrackingError').replace('${error}', error.message),
        [{ text: t('ok') }]
      );
    }
  };

  const checkIfWithinTaskRadius = (userCoords) => {
    console.log(t('radiusCheckDivider'));
    
    // Skip check if task isn't loaded yet
    if (!task) {
      console.log('Task data not loaded yet, skipping radius check');
      return;
    }
    
    console.log(t('checkingTaskRadius', { taskId: task._id }));
    
    // Validate task has location data
    if (!task?.location?.coordinates || task.location.coordinates.length !== 2) {
      console.error(t('taskMissingCoordinates', { location: JSON.stringify(task?.location) }));
      setIsWithinRadius(false);
      return;
    }
    
    // Get task data
    const taskCoords = {
      latitude: task.location.coordinates[1],
      longitude: task.location.coordinates[0]
    };
    
    const taskRadius = task.radius || 0.1; // Default to 0.1km if not specified
    console.log(t('taskPosition', { position: JSON.stringify(taskCoords) }));
    console.log(t('taskRadius', { radius: taskRadius }));
    console.log(t('userPosition', { position: JSON.stringify(userCoords) }));
    
    // Calculate distance
    const distanceInKm = calculateDistance(
      userCoords.latitude, 
      userCoords.longitude, 
      taskCoords.latitude, 
      taskCoords.longitude
    );
    
    const distanceInMeters = distanceInKm * 1000;
    console.log(t('distanceToTask', { 
      km: distanceInKm.toFixed(6), 
      meters: distanceInMeters.toFixed(2) 
    }));
    
    // Check if within radius - compare kilometers to kilometers since radius is in km
    const withinRadius = distanceInKm <= taskRadius;
    
    if (withinRadius) {
      console.log(t('withinTaskRadius', { 
        distance: distanceInMeters.toFixed(0),
        taskTitle: task.title
      }));
    } else {
      console.log(t('outsideTaskRadius', { 
        distance: distanceInMeters.toFixed(0),
        taskTitle: task.title,
        radius: taskRadius * 1000 // Convert to meters for log display
      }));
    }
    
    // Only update state if value changed to avoid rerenders
    if (isWithinRadius !== withinRadius) {
      console.log(t('updatingRadiusState', { 
        from: isWithinRadius.toString(), 
        to: withinRadius.toString() 
      }));
      setIsWithinRadius(withinRadius);
    }
    console.log(t('radiusCheckDivider'));
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    
    return distance;
  };

  const loadTaskDetails = async () => {
    setLoading(true);
    
    try {
      // Intentar cargar los detalles de la tarea desde la API
      console.log(`Intentando cargar tarea desde: ${api.baseUrl}/api/tasks/${taskId}`);
      
      const taskDetails = await api.getTaskById(taskId);
      console.log('TASK DETAILS LOADED FROM API:', JSON.stringify(taskDetails, null, 2));
      
      // Comprobación detallada de campos
      if (!taskDetails.timeLimit) {
        console.log('No se encontró campo timeLimit en la tarea');
      } else {
        console.log(`Campo timeLimit encontrado: ${taskDetails.timeLimit} minutos`);
      }
      
      if (!taskDetails.timeLimitSet) {
        console.log('No se encontró campo timeLimitSet en la tarea');
      } else {
        console.log(`Campo timeLimitSet encontrado: ${taskDetails.timeLimitSet}`);
      }
      
      // Forzar la conversión de timeLimit a número si es string
      if (taskDetails.timeLimit && typeof taskDetails.timeLimit === 'string') {
        taskDetails.timeLimit = Number(taskDetails.timeLimit);
        console.log('Campo timeLimit convertido a número:', taskDetails.timeLimit);
      }
      
      // Si no hay timeLimitSet pero sí hay timeLimit, establecerlo ahora
      if (taskDetails.timeLimit && !taskDetails.timeLimitSet) {
        console.log('Estableciendo timeLimitSet ya que no estaba presente');
        taskDetails.timeLimitSet = new Date().toISOString();
      }
      
      // Verificar ubicación
      if (taskDetails.location) {
        console.log(`Ubicación encontrada: ${JSON.stringify(taskDetails.location)}`);
      } else {
        console.log('No se encontró ubicación en la tarea');
      }
      
      setTask(taskDetails);
      
      // Cargar ubicación - usamos userLocation en lugar de taskLocation
      if (taskDetails.location && taskDetails.location.coordinates) {
        const [longitude, latitude] = taskDetails.location.coordinates;
        
        if (latitude !== 0 && longitude !== 0) {
          // Actualizar la ubicación inicial del usuario con la ubicación de la tarea
          // Solo para fines de inicialización, se actualizará con la posición real del dispositivo
          setUserLocation({
            latitude,
            longitude,
            accuracy: 0, // Valor predeterminado
          });
        }
      }
    } catch (error) {
      console.error('Error cargando detalles de la tarea:', error);
      setError(error.message || t('errorLoadingTask'));
    } finally {
      setLoading(false);
    }
  };

  const toggleComplete = async () => {
    if (!task) return;
    
    try {
      const updatedTask = await api.updateTask(taskId, { completed: !task.completed });
      setTask(updatedTask);
      Alert.alert(
        t('success'),
        task.completed ? t('taskMarkedIncomplete') : t('taskMarkedComplete')
      );
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert(t('error'), t('errorUpdatingTask'));
    }
  };

  const handleStartTask = async () => {
    if (!isWithinRadius) {
      Alert.alert(t('error'), t('mustBeWithinRadius'));
      return;
    }

    // Verificar si el usuario ya ha tomado una decisión
    if (!user.isAdmin && !hasShownConfirmation && !showTaskConfirmation) {
      setShowTaskConfirmation(true);
      return;
    }

    try {
      if (!user.isAdmin && showTaskConfirmation) {
        setConfirmationLoading(true);
      }
      
      // Establecer la fecha de inicio del temporizador
      const now = new Date().toISOString();
      
      // Update task status to in-progress
      const updatedTask = await api.updateTask(taskId, { 
        status: 'in-progress',
        timeLimitSet: now  // Establecer explícitamente la fecha de inicio del temporizador
      });
      
      // La actividad se registra automáticamente en el backend
      
      setTask(updatedTask);
      setTaskStarted(true);
      setHasShownConfirmation(true);
      
      if (showTaskConfirmation) {
        setShowTaskConfirmation(false);
        setConfirmationLoading(false);
      }

      // Iniciar manualmente el temporizador
      startTaskTimer();
      
      Alert.alert(t('success'), t('taskStarted'));
    } catch (error) {
      console.error('Error starting task:', error);
      setConfirmationLoading(false);
      Alert.alert(t('error'), t('errorStartingTask'));
    }
  };

  const handleEndTask = async () => {
    try {
      // Primero asegurarse de detener el modo manos libres
      setTaskStarted(false);
      
      // Luego actualizar la tarea en el backend
      const updatedTask = await api.updateTask(taskId, { 
        status: 'completed',
        completed: true 
      });
      setTask(updatedTask);

      // Si la tarea tenía handsFreeMode, registrar que se ha desactivado
      if (task.handsFreeMode) {
        console.log('Desactivando modo manos libres para la tarea completada');
      }

      Alert.alert(t('success'), t('taskCompleted'));
    } catch (error) {
      console.error('Error completing task:', error);
      Alert.alert(t('error'), t('errorCompletingTask'));
    }
  };

  const handleDeleteTask = async () => {
    // Verificar si el usuario es administrador
    if (!user?.isAdmin) {
      console.error('Permiso denegado: Solo los administradores pueden eliminar tareas');
      Alert.alert(t('permissionDenied'), t('adminOnlyDeleteTasks'));
      return;
    }

    Alert.alert(
      t('confirmDelete'),
      t('confirmDeleteTaskMessage'),
      [
        {
          text: t('cancel'),
          style: 'cancel'
        },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Eliminar la tarea - el backend registrará la actividad automáticamente
              await api.deleteTask(taskId);
              
              // Notificar al usuario y volver a la pantalla anterior
              Alert.alert(t('success'), t('taskDeleted'));
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert(t('error'), t('errorDeletingTask'));
            }
          }
        }
      ]
    );
  };

  // Function to stop location tracking
  const stopLocationTracking = async () => {
    console.log(t('stoppingLocationTracking'));
    if (locationSubscription) {
      locationSubscription.remove();
      console.log(t('locationTrackingStopped'));
      setLocationSubscription(null);
    }
    setIsLocationTracking(false);
  };

  // Función para enviar una actividad relacionada con la tarea
  const submitActivity = async () => {
    console.log('⭐ INICIO submitActivity - texto ingresado:', activityInput);
    
    // Solo validación básica: no vacío
    const inputText = activityInput.trim();
    if (!inputText) {
      console.log('❌ Error: Input vacío');
      Alert.alert(t('error'), t('pleaseEnterActivity'));
      return;
    }

    if (!taskStarted) {
      console.log('❌ Error: Tarea no iniciada');
      Alert.alert(t('error'), t('startTaskFirst'));
      return;
    }

    console.log('✅ Validaciones pasadas, iniciando envío...');
    setIsSubmittingActivity(true);

    try {
      // Verificar integridad de task y task._id
      console.log('📋 Datos de tarea:', JSON.stringify({
        taskExists: !!task,
        taskId: task?._id,
        taskTitle: task?.title
      }, null, 2));
      
      // Crear un objeto de nota exactamente igual al formato usado por VoiceListener
      const noteData = {
        text: inputText,
        type: 'voice_note', // Usar el mismo tipo que las notas de voz
        timestamp: new Date().toISOString(),
        keyword: '', // Campo vacío pero incluido para mantener consistencia
        source: 'manual_input' // Identificar que es entrada manual
      };

      console.log('📤 Enviando nota manual al backend:', JSON.stringify(noteData, null, 2));
      
      // Obtener token de autenticación
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación para guardar la nota');
      }
      
      // Usar el mismo endpoint que usa VoiceListener
      const url = `https://managetime-backend-48f256c2dfe5.herokuapp.com/api/tasks/${task._id}/note`;
      
      // Enviar la nota al backend usando el mismo formato que VoiceListener
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(noteData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Nota manual no guardada, error ${response.status}:`, errorText);
        throw new Error(`Error al guardar nota manual: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      console.log('✅ Nota manual guardada exitosamente:', responseData);
      
      // Limpiar input y mostrar mensaje de éxito
      setActivityInput('');
      Alert.alert(t('success'), t('activityRecorded'));
      
    } catch (error) {
      console.log('❌❌❌ ERROR CAPTURADO:', error);
      console.error('Error al enviar nota manual:', error);
      
      // Mostrar el mensaje de error
      const errorMessage = error.message || t('errorSubmittingActivity');
      console.log('Mensaje final mostrado al usuario:', errorMessage);
      Alert.alert(t('error'), errorMessage);
    } finally {
      console.log('🏁 Finalizando submitActivity');
      setIsSubmittingActivity(false);
    }
  };

  const loadTaskActivities = async () => {
    try {
      const activities = await api.getTaskActivities(taskId);
      if (activities && Array.isArray(activities)) {
        setTaskActivities(activities);
      }
    } catch (error) {
      console.error('Error al cargar actividades:', error);
    }
  };

  // Cargar actividades cuando se carga la tarea
  useEffect(() => {
    if (task && task._id) {
      loadTaskActivities();
    }
  }, [task]);

  // Función para manejar cuando se detecta una palabra clave
  const handleKeywordDetected = (keyword) => {
    console.log(`Palabra clave detectada: "${keyword}"`);
    
    // Normalizar la palabra clave detectada para comparación
    const normalizedKeyword = keyword.trim().toLowerCase();
    
    setSpokenKeywords(prev => {
      // Verificar si ya existe considerando mayúsculas/minúsculas
      const alreadyExists = prev.some(
        spoken => spoken.toLowerCase().trim() === normalizedKeyword
      );
      
      if (!alreadyExists) {
        console.log(`Añadiendo palabra clave nueva: "${keyword}"`);
        return [...prev, keyword];
      }
      
      console.log(`La palabra clave "${keyword}" ya estaba registrada`);
      return prev;
    });
  };

  // Función para extraer palabras clave de la tarea
  const getTaskKeywords = () => {
    if (!task || !task.keywords) return [];
    
    if (typeof task.keywords === 'string') {
      return task.keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
    }
    
    if (Array.isArray(task.keywords)) {
      return task.keywords;
    }
    
    return [];
  };

  // Función para manejar el rechazo de tarea
  const handleRejectTask = async () => {
    try {
      setConfirmationLoading(true);
      
      // Cerrar el modal primero
      setShowTaskConfirmation(false);
      
      // Marcar que ya se mostró la confirmación para que no vuelva a aparecer
      setHasShownConfirmation(true);
      
      // Guardar permanentemente que esta tarea ya ha sido confirmada
      await saveTaskAsConfirmed();
      
      // Notificar al usuario
      Alert.alert(
        t('taskRejected') || 'Tarea rechazada',
        t('taskRejectedMessage') || 'Esta tarea ha sido eliminada porque la rechazaste.',
        [{ text: t('ok') || 'OK' }]
      );
      
      // Eliminar la tarea directamente (igual que cuando el tiempo se agota)
      await api.deleteTask(taskId);
      
      // Regresar a la pantalla anterior
      navigation.goBack();
      
      setConfirmationLoading(false);
    } catch (error) {
      console.error('Error rechazando tarea:', error);
      setConfirmationLoading(false);
      Alert.alert(t('error') || 'Error', t('errorRejectingTask') || 'Error al rechazar la tarea');
    }
  };

  // Nueva función para aceptar tarea sin iniciarla
  const handleAcceptTask = async () => {
    try {
      setConfirmationLoading(true);
      
      // Actualizar el estado de la tarea a "accepted" (no "in-progress")
      const updatedTask = await api.updateTask(taskId, { 
        status: 'accepted',
        acceptedAt: new Date().toISOString()
      });
      
      // La actividad se registra automáticamente en el backend
      
      // Actualizar estado local pero asegurarse de NO iniciar la tarea
      setTask(updatedTask);
      
      // Marcar que ya se mostró la confirmación para que no vuelva a aparecer
      setHasShownConfirmation(true);
      
      // Guardar permanentemente que esta tarea ya ha sido confirmada
      await saveTaskAsConfirmed();
      
      // Cerrar modal
      setShowTaskConfirmation(false);
      setConfirmationLoading(false);
      
      // Notificar al usuario
      Alert.alert(
        t('taskAccepted') || 'Tarea aceptada',
        t('taskAcceptedMessage') || 'Has aceptado esta tarea. Puedes iniciarla cuando estés listo.'
      );
    } catch (error) {
      console.error('Error aceptando tarea:', error);
      setConfirmationLoading(false);
      Alert.alert(t('error') || 'Error', t('errorAcceptingTask') || 'Error al aceptar la tarea');
    }
  };

  // Función para guardar que la tarea ha sido confirmada
  const saveTaskAsConfirmed = async () => {
    try {
      // Obtener lista actual de tareas confirmadas
      const confirmedTasksString = await AsyncStorage.getItem('confirmedTasks');
      const confirmedTasks = confirmedTasksString ? JSON.parse(confirmedTasksString) : [];
      
      // Añadir esta tarea si no está ya incluida
      if (!confirmedTasks.includes(taskId)) {
        confirmedTasks.push(taskId);
        // Guardar la lista actualizada
        await AsyncStorage.setItem('confirmedTasks', JSON.stringify(confirmedTasks));
        console.log(`Tarea ${taskId} marcada como confirmada permanentemente`);
      }
    } catch (error) {
      console.error('Error guardando estado de confirmación:', error);
    }
  };

  // Función para abrir la ubicación de la tarea en la aplicación de mapas nativa
  const openInMaps = () => {
    if (!task || !task.location || !task.location.coordinates) {
      Alert.alert(t('error') || 'Error', t('noLocationData') || 'No hay datos de ubicación disponibles');
      return;
    }

    const latitude = task.location.coordinates[1];
    const longitude = task.location.coordinates[0];
    const label = task.locationName || task.title || 'Ubicación de la tarea';

    try {
      // Crear URL según la plataforma
      let url;
      if (Platform.OS === 'ios') {
        // URL para Apple Maps en iOS
        url = `maps://app?saddr=Current%20Location&daddr=${latitude},${longitude}&dirflg=d`;
        console.log(`Abriendo Apple Maps con URL: ${url}`);
      } else {
        // URL para Google Maps en Android y otros
        url = `google.navigation:q=${latitude},${longitude}&mode=d`;
        console.log(`Abriendo Google Maps con URL: ${url}`);
      }

      // Verificar si la URL puede ser abierta
      Linking.canOpenURL(url)
        .then(supported => {
          if (supported) {
            return Linking.openURL(url);
          } else {
            // Si la URL específica de la plataforma no es compatible, intentar con una URL web de Google Maps
            const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
            console.log(`URL específica no soportada, intentando con URL web: ${webUrl}`);
            return Linking.openURL(webUrl);
          }
        })
        .catch(err => {
          console.error('Error al abrir la aplicación de mapas:', err);
          Alert.alert(
            t('error') || 'Error', 
            t('cannotOpenMaps') || 'No se pudo abrir la aplicación de mapas'
          );
        });
    } catch (error) {
      console.error('Error al intentar abrir mapas:', error);
      Alert.alert(t('error') || 'Error', t('mapError') || 'Error al abrir mapas');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadTaskDetails}
        >
          <Text style={styles.retryButtonText}>{t('retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t('taskNotFound')}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>{t('goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Check if task has location data
  const hasLocation = task.location && 
                      task.location.coordinates && 
                      task.location.coordinates.length === 2;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1c1c1c" />
      
      <View style={styles.headerMain}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff3e5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{task ? task.title : t('taskDetails')}</Text>
        <View style={styles.headerRightPlaceholder}></View>
      </View>
      
      {/* Timer display section prominently positioned */}
      {task && task.timeLimit > 0 && remainingTime !== null && (
        <View style={[
          styles.timerContainer, 
          remainingTime < 300000 ? styles.timerWarning : null  // Rojo cuando quedan menos de 5 minutos
        ]}>
          <Ionicons name="timer-outline" size={24} color={remainingTime < 300000 ? "#FF5252" : "#fff3e5"} />
          <Text style={[
            styles.timerText, 
            remainingTime < 300000 ? styles.timerTextWarning : null
          ]}>
            {formatRemainingTime(remainingTime)}
          </Text>
          <Text style={styles.timerLabel}>
            {remainingTime < 300000 
              ? (t('timeRunningOut') || '¡Tiempo agotándose!') 
              : (t('timeRemaining') || 'Tiempo restante')}
          </Text>
        </View>
      )}
      
      <ScrollView style={styles.container}>
        {/* Timer display section only if task has a time limit */}
        {/* {task && task.timeLimit && remainingTime !== null && (
          <View style={styles.timerContainer}>
            <Ionicons name="timer-outline" size={24} color={remainingTime > 300000 ? '#fff3e5' : '#FF6B6B'} />
            <Text style={[
              styles.timerText, 
              remainingTime <= 300000 ? styles.timerWarning : {}
            ]}>
              {formatRemainingTime(remainingTime)}
            </Text>
            {remainingTime <= 300000 && (
              <Text style={styles.timerWarningText}>
                {t('timeRunningOut') || '¡Tiempo agotándose!'}
              </Text>
            )}
          </View>
        )} */}
        
        <View style={styles.header}>
          <View style={styles.taskStatusContainer}>
            <TouchableOpacity
              style={[
                styles.completeButton,
                task.completed && styles.completedButton
              ]}
              onPress={toggleComplete}
            >
              <Text style={styles.completeButtonText}>
                {task.completed ? '✓' : '○'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.taskStatus}>
              {task.completed ? t('completed') : t('pending')}
            </Text>
          </View>
          
          {user?.isAdmin && (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={handleDeleteTask}
            >
              <Ionicons name="trash-outline" size={24} color="#e74c3c" />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{task.title || t('noTitle')}</Text>
        </View>
        
        <View style={styles.infoContainer}>
          {/* Descripción */}
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>{t('description')}:</Text>
            <Text style={styles.description}>{task.description || t('noDescription')}</Text>
          </View>
          
          {/* Fechas en una sola fila */}
          <View style={styles.datesContainer}>
            <View style={styles.dateSection}>
              <Text style={styles.infoLabel}>{t('created')}:</Text>
              <Text style={styles.dateValue}>
                {task.createdAt ? new Date(task.createdAt).toLocaleString() : t('unknown')}
              </Text>
            </View>
            
            <View style={styles.dateSection}>
              <Text style={styles.infoLabel}>{t('updated')}:</Text>
              <Text style={styles.dateValue}>
                {task.updatedAt ? new Date(task.updatedAt).toLocaleString() : t('unknown')}
              </Text>
            </View>
          </View>
          
          {(user?.isAdmin || task.userId === user?._id) && (
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>{t('assignedTo')}:</Text>
              <Text style={styles.value}>
                {assignedUser ? assignedUser.username : 
                 (typeof task.userId === 'object' && task.userId.username) ? task.userId.username : 
                 t('noUserAssigned')}
              </Text>
            </View>
          )}
        </View>
        
        {hasLocation && (
          <View style={styles.mapContainer}>
            <Text style={styles.mapLabel}>{t('taskLocation')}:</Text>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: task.location.coordinates[1],
                longitude: task.location.coordinates[0],
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
            >
              <Marker
                coordinate={{
                  latitude: task.location.coordinates[1],
                  longitude: task.location.coordinates[0],
                }}
                title={task.title}
              />
              {task.radius && (
                <Circle
                  center={{
                    latitude: task.location.coordinates[1],
                    longitude: task.location.coordinates[0],
                  }}
                  radius={task.radius * 1000} // Convert km to meters for map display
                  strokeWidth={2}
                  strokeColor={'#1877F2'} // Color azul de Facebook
                  fillColor={'rgba(24, 119, 242, 0.2)'} // Color azul de Facebook con transparencia
                />
              )}
              {userLocation && (
                <Marker
                  coordinate={{
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                  }}
                  title={t('yourLocation')}
                  pinColor="#4CAF50"
                />
              )}
            </MapView>
            <Text style={styles.locationName}>
              {task.locationName || `${task.location.coordinates[1]}, ${task.location.coordinates[0]}`}
            </Text>
            {task.radius && (
              <Text style={styles.radius}>
                {t('radius')}: {task.radius} km
              </Text>
            )}
            {isWithinRadius ? (
              <Text style={styles.withinRadius}>{t('withinTaskRadius')}</Text>
            ) : (
              <Text style={styles.outsideRadius}>{t('outsideTaskRadius')}</Text>
            )}
            
            {/* Botón para abrir la ubicación en mapas nativos */}
            <TouchableOpacity 
              style={styles.directionsButton}
              onPress={openInMaps}
            >
              <Ionicons name="navigate-outline" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.directionsButtonText}>
                {t('navigateToHere') || 'Navigate to here'}
              </Text>
            </TouchableOpacity>
            
            {/* Botón de iniciar/finalizar tarea integrado en el contenedor de mapa */}
            <View style={styles.mapActionButtonContainer}>
              {!taskStarted ? (
                <TouchableOpacity 
                  style={[
                    styles.startButton,
                    !isWithinRadius && styles.disabledButton
                  ]}
                  disabled={!isWithinRadius || task.completed}
                  onPress={handleStartTask}
                >
                  <Ionicons name="play" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.startButtonText}>{t('startTask')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.endButton}
                  onPress={handleEndTask}
                >
                  <Ionicons name="stop" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.endButtonText}>{t('endTask')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        
        <View style={styles.activityContainer}>
          <TextInput
            style={styles.activityInput}
            value={activityInput}
            onChangeText={setActivityInput}
            placeholder={t('enterActivity')}
            placeholderTextColor="rgba(255, 243, 229, 0.5)"
            color="#fff3e5"
          />
          <TouchableOpacity 
            style={styles.submitActivityButton}
            onPress={submitActivity}
            disabled={isSubmittingActivity}
          >
            <Text style={styles.submitActivityButtonText}>{t('submitActivity')}</Text>
          </TouchableOpacity>
        </View>
        
        {taskStarted && <VoiceListener isTaskActive={taskStarted} taskData={task} onKeywordDetected={handleKeywordDetected} />}
        
        {/* Nuevo componente para mostrar palabras clave */}
        <View style={styles.keywordsContainer}>
          <Text style={styles.keywordsLabel}>{t('keywordsToSay')}</Text>
          <View style={styles.keywordsList}>
            {getTaskKeywords().map((keyword, index) => {
              // Verificar si la palabra clave ya ha sido pronunciada (normalizando para comparación)
              const isSpoken = spokenKeywords.some(
                spoken => spoken.toLowerCase().trim() === keyword.toLowerCase().trim()
              );
              
              return (
                <View key={index} style={styles.keywordWrapper}>
                  <Text 
                    style={[
                      styles.keyword, 
                      isSpoken && styles.spokenKeyword
                    ]}
                  >
                    {keyword}
                  </Text>
                  {isSpoken && (
                    <Ionicons 
                      name="checkmark-circle" 
                      size={16} 
                      color="#4CAF50" 
                      style={styles.keywordCheckmark} 
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
      
      {/* Agregar el modal de confirmación de tarea al final del componente */}
      {!user.isAdmin && !hasShownConfirmation && (
        <TaskConfirmationModal
          visible={showTaskConfirmation}
          task={task}
          onReject={handleRejectTask}
          onAcceptWithoutStart={handleAcceptTask} // Solo usamos la función para aceptar sin iniciar
          onClose={() => setShowTaskConfirmation(false)}
          isLoading={confirmationLoading}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2e2e2e',
  },
  container: {
    flex: 1,
    backgroundColor: '#2e2e2e',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2e2e2e',
  },
  headerMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#2e2e2e',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff3e5',
    flex: 1,
    textAlign: 'center',
  },
  timerContainer: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 10,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF8C00',
  },
  timerWarning: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderColor: '#FF3B30',
  },
  timerText: {
    color: '#fff3e5',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginVertical: 5,
  },
  timerTextWarning: {
    color: '#FF5252',
  },
  timerLabel: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,

    paddingVertical: 10,
    backgroundColor: '#1c1c1c',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 243, 229, 0.1)',

  },
  taskStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#fff3e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  completedButton: {

    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',

  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff3e5',
  },
  taskStatus: {
    fontSize: 16,

    color: '#fff3e5',

  },
  deleteButton: {
    padding: 8,
  },
  titleContainer: {
    padding: 15,

    backgroundColor: '#1c1c1c',

    marginBottom: 10,
    borderRadius: 15,
    marginHorizontal: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  infoContainer: {
    padding: 15,
    backgroundColor: '#fff3e5', // Fondo color crema
    marginBottom: 10,
    borderRadius: 15,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(28, 28, 28, 0.1)', // Borde sutil oscuro
  },
  infoSection: {
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#777777', // Subtítulos en gris
    marginBottom: 5,
  },
  description: {
    fontSize: 16,
    color: '#000000', // Texto en negro
    lineHeight: 24,
  },
  value: {
    fontSize: 16,
    color: '#000000', // Texto en negro
  },
  mapContainer: {
    padding: 15,
    backgroundColor: '#1c1c1c',
    marginBottom: 10,
    borderRadius: 15,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',

  },
  mapLabel: {
    fontSize: 16,
    fontWeight: 'bold',

    color: 'rgba(255, 243, 229, 0.7)',

    marginBottom: 10,
  },
  map: {
    height: 200,
    marginBottom: 10,
    borderRadius: 15,
    overflow: 'hidden',
  },
  locationName: {
    fontSize: 16,

    color: '#fff3e5',

    marginBottom: 5,
  },
  radius: {
    fontSize: 14,

    color: 'rgba(255, 243, 229, 0.7)',

    marginBottom: 5,
  },
  withinRadius: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  outsideRadius: {
    fontSize: 14,
    color: '#ff5252',
    fontWeight: 'bold',
    marginBottom: 5,
  },

  mapActionButtonContainer: {
    marginTop: 15,
  },
  directionsButton: {
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  directionsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  endButton: {
    backgroundColor: '#ff5252',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabledButton: {

    backgroundColor: 'rgba(255, 243, 229, 0.2)',

  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  endButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginRight: 8,
  },

  actionsContainer: {
    padding: 15,
    marginBottom: 20,
    marginHorizontal: 10,
  },
  backButton: {
    backgroundColor: '#1c1c1c',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  backButtonText: {
    color: '#fff3e5',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ff5252',

    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },
  retryButton: {

    backgroundColor: '#1c1c1c',

    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  retryButtonText: {

    color: '#fff3e5',

    fontSize: 16,
    fontWeight: 'bold',
  },
  activityContainer: {
    padding: 15,

    backgroundColor: '#1c1c1c',
    marginBottom: 10,
    borderRadius: 15,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',
  },
  activityInput: {
    height: 40,
    borderColor: 'rgba(255, 243, 229, 0.2)',

    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 16,

    color: '#fff3e5',
    backgroundColor: '#2e2e2e',
    borderRadius: 10,

  },
  submitActivityButton: {
    backgroundColor: '#fff3e5',
    padding: 10,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitActivityButtonText: {

    color: '#000',

    fontSize: 16,
    fontWeight: 'bold',
  },
  keywordsContainer: {
    padding: 15,

    backgroundColor: '#1c1c1c',
    marginBottom: 10,
    marginTop: 15,
    borderRadius: 15,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',

  },
  keywordsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff3e5',
    marginBottom: 10,
    borderBottomWidth: 1,

    borderBottomColor: 'rgba(255, 243, 229, 0.1)',
  },
  activityItemText: {
    fontSize: 16,
    color: '#fff3e5',

  },
  keyword: {
    fontSize: 14,

    color: 'rgba(255, 243, 229, 0.7)',

  },
  timerContainer: {
    backgroundColor: '#363636',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    color: '#fff3e5',
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  timerWarning: {
    color: '#FF6B6B',
  },
  timerWarningText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginLeft: 10,
  },
});

export default TaskDetailsScreen;