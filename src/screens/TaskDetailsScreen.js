import React, { useState, useEffect, useRef } from 'react';
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
  Platform,
  Modal
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getApiUrl } from '../services/platform-config';
import * as api from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VoiceListener from '../components/VoiceListener'; // Importar el componente de escucha de voz
import TaskConfirmationModal from '../components/TaskConfirmationModal'; // Importar modal de confirmación
import TaskTimer from '../components/TaskTimer'; // Importar el nuevo componente de temporizador
import LocationComponent from '../components/LocationComponent'; // Importar el componente de ubicación
import TaskForm from '../components/TaskForm'; // Importar el componente de formulario de tareas

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
  const [hasLoggedOnSite, setHasLoggedOnSite] = useState(false); // Estado para controlar si ya se ha registrado la llegada
  const [taskStarted, setTaskStarted] = useState(false);
  const [locationWatcher, setLocationWatcher] = useState(null);
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [activityInput, setActivityInput] = useState('');
  const [isSubmittingActivity, setIsSubmittingActivity] = useState(false);
  const [taskActivities, setTaskActivities] = useState([]);
  const [spokenKeywords, setSpokenKeywords] = useState([]); // Nuevo estado para palabras clave ya pronunciadas
  // Ya no necesitamos el estado remainingTime, se maneja en el componente TaskTimer
  const [showTaskConfirmation, setShowTaskConfirmation] = useState(false); // Estado para mostrar el modal de confirmación
  const [confirmationLoading, setConfirmationLoading] = useState(false); // Estado para indicar carga durante la confirmación
  const [hasShownConfirmation, setHasShownConfirmation] = useState(false); // Estado para controlar si ya se mostró la confirmación
  const [showEditModal, setShowEditModal] = useState(false); // Estados para el modal de edición
  const [isUpdatingTask, setIsUpdatingTask] = useState(false); // Estado para indicar cuando se está actualizando la tarea
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]); 
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingActivity, setPendingActivity] = useState('');

  // Referencia al componente de ubicación
  const locationComponentRef = useRef(null);

  // Función para manejar cuando el tiempo expira
  const handleTimeExpired = () => {
    console.log('Tiempo expirado para la tarea:', task?.title);
    
    if (!task || !task._id) {
      console.error('No se puede manejar la expiración de tiempo: tarea no disponible');
      return;
    }
    
    // Registrar una actividad sobre el vencimiento del tiempo
    submitActivity('time_expired', {
      message: 'Tiempo límite expirado para esta tarea. La tarea será eliminada , habalar con su administrador .'
    });
    
    // Guardar en AsyncStorage que el tiempo ha expirado para esta tarea
    AsyncStorage.setItem(`task_${task._id}_expired`, 'true')
      .then(() => {
        console.log(`Guardado estado de expiración para tarea ${task._id}`);
        return AsyncStorage.setItem(`task_${task._id}_expired_at`, new Date().toISOString());
      })
      .catch(error => {
        console.error('Error al guardar estado de expiración:', error);
      });
    
    // Mostrar una alerta al usuario y eliminar la tarea cuando confirme
    Alert.alert(
      t('timeExpired') || 'Tiempo Expirado',
      t('timeExpiredMessage') || 'El tiempo asignado para completar esta tarea ha terminado. La tarea será eliminada.',
      [
        { 
          text: t('ok') || 'OK',
          onPress: () => {
            // Borrar la tarea cuando el tiempo expira
            handleDeleteTask(true); // Pasamos true para indicar que es una eliminación automática
          }
        }
      ]
    );
  };

  useEffect(() => {
    loadTaskDetails();
    
    // Si el usuario es administrador, cargar la lista de usuarios activos
    if (user?.isAdmin) {
      loadActiveUsers();
    }

    return () => {
      if (locationSubscription) {
        // En versiones recientes de Expo Location, la suscripción tiene un método remove
        locationSubscription.remove();
      }
    };
  }, [taskId]);
  
  // Función para cargar usuarios activos
  const loadActiveUsers = async () => {
    try {
      const users = await api.getUsers();
      // Filtrar solo usuarios activos y no administradores
      setActiveUsers(users.filter(user => user.isActive && !user.isAdmin));
      console.log('Usuarios activos cargados:', users.length);
    } catch (error) {
      console.error('Error al cargar usuarios activos:', error);
    }
  };
  
  // Función para seleccionar o deseleccionar un usuario
  const selectUser = (userId) => {
    setSelectedUserIds(prevSelected => {
      if (prevSelected.includes(userId)) {
        // Si ya está seleccionado, deseleccionarlo
        return prevSelected.filter(id => id !== userId);
      } else {
        // Limitar a 2 usuarios como máximo
        const newSelection = [...prevSelected, userId].slice(0, 2);
        return newSelection;
      }
    });
  };

  // Efecto para iniciar el temporizador solo cuando la tarea está en camino o en el sitio
  useEffect(() => {
    let isActive = true; // Flag para evitar actualizaciones de estado si el componente se desmonta

    const setupTimer = async () => {
      if (!task) return;

      // Iniciar tracking de ubicación
      startLocationTracking();
      
      // Almacenar el estado de la tarea en AsyncStorage para persistencia
      try {
        await AsyncStorage.setItem(`task_${task._id}_status`, task.status);
        if (task.status === 'on_site') {
          await AsyncStorage.setItem(`task_${task._id}_started`, 'true');
        }
      } catch (error) {
        console.error('Error guardando estado de tarea:', error);
      }

      // Mostrar el temporizador si la tarea tiene límite de tiempo
      if (task.timeLimit) {
        console.log(`⏰ Verificando temporizador para tarea ${task._id} con estado ${task.status}`, {
          timeLimit: task.timeLimit,
          timeLimitSet: task.timeLimitSet,
          isOnTheWay: task.status === 'on_the_way',
          isOnSite: task.status === 'on_site'
        });
        
        // Si la tarea está en camino o en el sitio y tiene timeLimitSet, iniciar el timer
        if ((task.status === 'on_the_way' || task.status === 'on_site') && task.timeLimitSet) {
          console.log(`✅ Condiciones válidas para iniciar temporizador con estado ${task.status}`);
          
          // Al recargar la pantalla, guardar estado "started" si estamos en el sitio
          if (task.status === 'on_site' && !taskStarted && isActive) {
            console.log('🔄 Marcando tarea como iniciada porque está en sitio');
            setTaskStarted(true);
          }
          
          try {
            // Intentar recuperar el tiempo final guardado del AsyncStorage
            const storedEndTime = await AsyncStorage.getItem(`task_${task._id}_end_time`);
            console.log(`📄 Resultado de buscar tiempo almacenado:`, {
              storedEndTime,
              hasValue: !!storedEndTime,
              isActive
            });
            
            if (storedEndTime && isActive) {
              console.log(`📝 Recuperado tiempo final almacenado: ${storedEndTime}`);
              // Usar el tiempo final almacenado en lugar de recalcular
              startTaskTimer(parseInt(storedEndTime, 10));
            } else if (isActive) {
              console.log('🔄 Calculando nuevo tiempo final basado en timeLimitSet');
              startTaskTimer();
            }
          } catch (error) {
            console.error('❌ Error al recuperar tiempo almacenado:', error);
            if (isActive) startTaskTimer();
          }
        } 
        // Si solo tiene timeLimit pero aún no está aceptada o no tiene timeLimitSet, mostrar el timer estático
        else if (isActive) {
          // Mostrar el tiempo completo (sin contar)
          const timeLimitMs = task.timeLimit * 60 * 1000; // Convertir minutos a milisegundos
          setRemainingTime(timeLimitMs);
        }
      }
    };

    setupTimer();
    
    // Función de limpieza que se ejecuta cuando el componente se desmonta o cuando cambia task
    return () => {
      isActive = false; // Evitar actualizaciones de estado si el componente se desmonta
      // No eliminamos el temporizador aquí, ya que queremos que continúe cuando volvamos
      // La limpieza final se hace en el useEffect principal que depende de taskId
    };
  }, [task]);

  // Efecto para mostrar automáticamente el modal de confirmación
  useEffect(() => {
    // Mostrar automáticamente el modal de confirmación para usuarios normales
    // cuando se carga una tarea que está esperando aceptación
    if (
      task && 
      !user.isAdmin && 
      !hasShownConfirmation && 
      (task.status === 'waiting_for_acceptance') && 
      !task.completed
    ) {
      console.log('⚠️ Mostrando modal de confirmación para tarea:', taskId);
      // Pequeño delay para asegurar que la interfaz ya está renderizada
      const timer = setTimeout(() => {
        setShowTaskConfirmation(true);
      }, 500);
      
      return () => clearTimeout(timer);
    } else if (task) {
      console.log('ℹ️ No se muestra confirmación. Estado actual:', { 
        taskId: taskId,
        status: task.status, 
        isAdmin: user?.isAdmin, 
        hasShownConfirmation, 
        isCompleted: task.completed 
      });
      
      // El backend ya debe estar utilizando exclusivamente los nuevos estados
    }
  }, [task, user, hasShownConfirmation, taskId]);

  // Efecto para comprobar si esta tarea ya ha sido confirmada anteriormente
  useEffect(() => {
    // Función para verificar si esta tarea ya ha sido confirmada
    const checkTaskConfirmation = async () => {
      try {
        // Obtener estado guardado de confirmación para esta tarea
        const confirmedTasksJson = await AsyncStorage.getItem('confirmedTasks');
        const confirmedTasks = confirmedTasksJson ? JSON.parse(confirmedTasksJson) : [];
        
        // Verificar si esta tarea ya está en la lista de confirmadas
        if (confirmedTasks.includes(taskId)) {
          console.log(`Tarea ${taskId} ya ha sido confirmada anteriormente`);
          setHasShownConfirmation(true);
        } else {
          console.log(`Tarea ${taskId} aún no ha sido confirmada`);
          setHasShownConfirmation(false);
        }
      } catch (error) {
        console.error('Error al verificar confirmación de tarea:', error);
        // Si hay error, seguimos mostrando el modal por seguridad
        setHasShownConfirmation(false);
      }
    };
    
    checkTaskConfirmation();
  }, [taskId]);

  // Efecto para cambiar el estado cuando el usuario entra en el radio de la tarea
  useEffect(() => {
    // Verificar si el usuario entró al radio y hay un temporizador activo
    if (isWithinRadius && task?.timeLimit && task?.timeLimitSet) {
      console.log('USUARIO ENTRÓ AL RADIO - CAMBIANDO ESTADO A ON_SITE');
      
      // Primero actualizar el estado local inmediatamente
      setTask({
        ...task,
        timeLimitSet: null,
        status: 'on_site' // Cambiar al estado "en el sitio"
      });
      
      // Ya no necesitamos limpiar el temporizador aquí, eso se maneja en el componente TaskTimer
      // El componente TaskTimer detectará el cambio en task.timeLimitSet
      
      // Luego actualizar en el backend
      api.updateTask(taskId, { 
        timeLimitSet: null, // Eliminar la fecha de inicio del temporizador
        status: 'on_site' // Cambiar al estado "en el sitio"
      }).then(updatedTask => {
        console.log('Tarea actualizada en backend: temporizador desactivado y estado cambiado a ON_SITE');
        
        // Registrar actividad de llegada al sitio si no estaba en ese estado previamente
        if (task.status !== 'on_site') {
          submitActivity('task_on_site', {
            message: 'Llegada al sitio de la tarea'
          });
        }
      }).catch(error => {
        console.error('Error al actualizar la tarea:', error);
      });
    }
  }, [isWithinRadius, task]);

  useEffect(() => {
    if (isWithinRadius && task && task.status !== 'on_site' && !hasLoggedOnSite) {
      console.log('⚠️ Usuario dentro del radio pero la tarea no está en estado "on_site"');
      
      // Si la tarea no está completada y no está en estado "on_site", actualizar estado
      if (!task.completed) {
        console.log('📱 Actualizando tarea a estado "on_site"');
        try {
          api.updateTask(task._id, { status: 'on_site' })
            .then(updatedTask => {
              console.log('✅ Tarea actualizada a estado on_site:', updatedTask);
              setTask(updatedTask);
              setHasLoggedOnSite(true); // Marcar que ya se ha registrado la llegada
              console.log('🔄 hasLoggedOnSite establecido a TRUE para evitar registros duplicados');
            })
            .catch(error => {
              console.error('❌ Error al actualizar tarea a on_site:', error);
              Alert.alert(t('error') || 'Error', t('errorUpdatingTask') || 'Error al actualizar tarea a on_site');
            });
        } catch (error) {
          console.error('❌❌ Error crítico al actualizar tarea a on_site:', error);
          Alert.alert(t('error') || 'Error', `Error al actualizar tarea: ${error.message}`);
        }
      }
    }
  }, [isWithinRadius, task, hasLoggedOnSite]);

// La función startTaskTimer ya no es necesaria, se maneja en el componente TaskTimer

// La función formatRemainingTime ya no es necesaria, se maneja en el componente TaskTimer

// ...

const loadTaskDetails = async () => {
  setLoading(true);
  
  try {
    // Primero intentar recuperar el estado del temporizador guardado
    let storedEndTime = null;
    try {
      storedEndTime = await AsyncStorage.getItem(`task_${taskId}_end_time`);
      const timerActive = await AsyncStorage.getItem(`task_${taskId}_timer_active`);
      console.log(`⏰ Estado del temporizador recuperado:`, {
        taskId,
        storedEndTime,
        timerActive
      });
    } catch (storageError) {
      console.error('Error al recuperar estado del temporizador:', storageError);
    }
    
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
    
    // Si la tarea tiene límite de tiempo pero no tiene timeLimitSet, establecerlo (para cualquier estado)
    if (taskDetails.timeLimit && !taskDetails.timeLimitSet) {
      console.log('⚠️ La tarea está en camino/sitio pero no tiene timeLimitSet, intentando recuperar del servidor');
      
      // Intentamos actualizar la tarea para establecer timeLimitSet si es necesario
      try {
        const updatedTask = await api.updateTask(taskId, { 
          status: taskDetails.status,
          timeLimitSet: new Date().toISOString() 
        });
        if (updatedTask && updatedTask.timeLimitSet) {
          taskDetails.timeLimitSet = updatedTask.timeLimitSet;
          console.log('✅ TimeLimitSet actualizado en el servidor:', taskDetails.timeLimitSet);
        }
      } catch (updateError) {
        console.error('❌ Error al actualizar timeLimitSet en el servidor:', updateError);
        // Establecer localmente como último recurso
        taskDetails.timeLimitSet = new Date().toISOString();
      }
    }
    
    // Verificar ubicación
    if (taskDetails.location) {
      console.log(`Ubicación encontrada: ${JSON.stringify(taskDetails.location)}`);
    } else {
      console.log('No se encontró ubicación en la tarea');
    }
    
    // Si la tarea está en estado on_site, asegurarnos de que taskStarted sea true
    if (taskDetails.status === 'on_site') {
      setTaskStarted(true);
    }
    
    setTask(taskDetails);
    
    // Toda la lógica de temporizador se ha movido al componente TaskTimer
    
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

// Función para marcar la tarea como completada o no completada
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
      
      // Update task status to on_site (en el sitio)
      const updatedTask = await api.updateTask(taskId, { 
        status: 'on_site',
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

      // El temporizador se iniciará automáticamente en el componente TaskTimer
      
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
      
      // Ya no es necesario detener el temporizador manualmente, se manejará en el componente TaskTimer
    
    // Actualizar la tarea en el backend
    const updatedTask = await api.updateTask(taskId, { 
      status: 'completed', // Mantener status 'completed' como estaba
      completed: true,
      timeLimitSet: null // Eliminar la fecha de inicio del temporizador
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

  const handleDeleteTask = async (isAutomatic = false) => {
    // Si no es eliminación automática, verificar si el usuario es administrador
    if (!isAutomatic && !user?.isAdmin) {
      console.error('Permiso denegado: Solo los administradores pueden eliminar tareas');
      Alert.alert(t('permissionDenied'), t('adminOnlyDeleteTasks'));
      return;
    }

    // Si es una eliminación automática (por tiempo expirado), omitimos la confirmación
    if (isAutomatic) {
      try {
        console.log('Eliminando tarea automáticamente por tiempo expirado:', taskId);
        // Eliminar la tarea - el backend registrará la actividad automáticamente
        await api.deleteTask(taskId);
        
        // Volver a la pantalla anterior sin notificación adicional (ya se mostró la notificación de tiempo expirado)
        navigation.goBack();
      } catch (error) {
        console.error('Error eliminando tarea automáticamente:', error);
        Alert.alert(t('error'), t('errorDeletingTask'));
      }
      return;
    }

    // Si no es automática, mostramos el diálogo de confirmación normal
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

  // Función para iniciar el seguimiento de ubicación
  const startLocationTracking = async () => {
    console.log('Iniciando seguimiento de ubicación...');
    
    if (isLocationTracking) {
      console.log('El seguimiento de ubicación ya está activo');
      return;
    }
    
    try {
      // Solicitar permisos de ubicación
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.error('Permiso de ubicación denegado');
        Alert.alert(t('error'), t('locationPermissionDenied'));
        return;
      }
      
      // Obtener la ubicación actual
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest
      });
      
      // Actualizar la ubicación del usuario
      setUserLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy
      });
      
      // Verificar si el usuario está dentro del radio de la tarea
      checkIfWithinTaskRadius(currentLocation.coords);
      
      // Iniciar seguimiento continuo de ubicación
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          timeInterval: 5000,  // Actualizar cada 5 segundos
          distanceInterval: 10  // O cuando se mueva 10 metros
        },
        (location) => {
          console.log('Nueva ubicación recibida:', JSON.stringify(location.coords));
          
          // Actualizar la ubicación del usuario
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy
          });
          
          // Verificar si el usuario está dentro del radio de la tarea
          checkIfWithinTaskRadius(location.coords);
        }
      );
      
      // Guardar la suscripción para poder cancelarla después
      setLocationSubscription(subscription);
      setIsLocationTracking(true);
      console.log('Seguimiento de ubicación iniciado con éxito');
    } catch (error) {
      console.error('Error al iniciar seguimiento de ubicación:', error);
      Alert.alert(t('error'), t('errorStartingLocationTracking'));
    }
  };
  
  // Función para verificar si el usuario está dentro del radio de la tarea
  const checkIfWithinTaskRadius = (userCoords) => {
    if (!task || !task.location || !task.location.coordinates || !task.radius) {
      console.log('No se puede verificar radio: faltan datos de ubicación o radio de la tarea');
      return;
    }
    
    const [taskLongitude, taskLatitude] = task.location.coordinates;
    const taskRadiusMeters = task.radius * 1000; // Convertir km a metros
    
    // Calcular distancia entre usuario y tarea (fórmula de Haversine)
    const distanceInMeters = getDistanceFromLatLonInM(
      userCoords.latitude,
      userCoords.longitude,
      taskLatitude,
      taskLongitude
    );
    
    const withinRadius = distanceInMeters <= taskRadiusMeters;
    console.log(`Distancia al punto de la tarea: ${distanceInMeters.toFixed(2)}m, Radio: ${taskRadiusMeters}m, Dentro del radio: ${withinRadius}`);
    
    // Actualizar estado solo si hay un cambio
    if (withinRadius !== isWithinRadius) {
      setIsWithinRadius(withinRadius);
      
      // Si acaba de entrar al radio y la tarea está en estado 'on_the_way', actualizarla a 'on_site'
      if (withinRadius && task.status === 'on_the_way' && !hasLoggedOnSite) {
        console.log('Usuario entró al radio y la tarea está en camino - actualizando a "en el sitio"');
        api.updateTask(task._id, { status: 'on_site' })
          .then(updatedTask => {
            console.log('Tarea actualizada a estado "en el sitio":', updatedTask);
            
            // Verificar si se detuvo el temporizador (para usuarios comunes)
            if (updatedTask.timeLimitSet === null && !user.isAdmin) {
              console.log('✅ Temporizador detenido automáticamente por llegada al radio');
              // Limpiar datos del temporizador en AsyncStorage
              AsyncStorage.removeItem(`task_${task._id}_end_time`);
              AsyncStorage.removeItem(`task_${task._id}_timer_active`);
            }
            
            setTask(updatedTask);
            setHasLoggedOnSite(true);
            
            // Registrar actividad de llegada al sitio
            submitActivity('task_on_site', {
              message: 'Llegada al sitio de la tarea'
            });
          })
          .catch(error => {
            console.error('Error al actualizar estado de tarea:', error);
          });
      }
    }
  };
  
  // Función auxiliar para calcular distancias (fórmula de Haversine)
  const getDistanceFromLatLonInM = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1); 
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c;
    return distance;
  };
  
  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
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
  const submitActivity = async (type = null, metadata = null) => {
    // Si se proporcionan tipo y metadata, es una llamada interna (no del formulario)
    if (type && metadata) {
      console.log(`⭐ Enviando actividad de tipo ${type} con metadatos:`, metadata);
      
      try {
        if (!task || !task._id) {
          console.error('No se puede enviar actividad: tarea no disponible');
          return;
        }
        
        // Enviar la actividad directamente al backend usando saveActivity en lugar de addTaskActivity
        await api.saveActivity({
          taskId: task._id,
          type,
          message: metadata.message || 'Actividad registrada',
          metadata
        });
        
        console.log(`✅ Actividad de tipo ${type} enviada correctamente`);
        return;
      } catch (error) {
        console.error(`Error al enviar actividad de tipo ${type}:`, error);
        return;
      }
    }
    
    // Procesar actividad desde el formulario de entrada de texto
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
        type: 'NOTES', // Actualizado al nuevo tipo que reemplaza a 'voice_note'
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
      
      // Usar el mismo endpoint que usa VoiceListener (asegurando que incluya el prefijo /api)
      const url = `${getApiUrl()}/api/tasks/${task._id}/note`;
      
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

  // Cargar actividades de la tarea
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

  
  // Función para editar la tarea actual (solo administradores)
  const handleEditTask = async (updatedTaskData) => {
    // Verificación estricta de permisos de administrador para asignar/reasignar usuarios
    if (!user?.isAdmin) {
      Alert.alert(t('error'), t('adminPermissionRequired'));
      return;
    }
    
    try {
      setIsUpdatingTask(true);
      
      console.log('Datos recibidos del formulario para actualizar:', JSON.stringify(updatedTaskData, null, 2));
      
      // Aseguramos que los userIds provengan exclusivamente del formulario de edición
      // Los usuarios solo pueden ser asignados/reasignados a través del TaskForm
      const updatedTask = await api.updateTask(task._id, {
        ...updatedTaskData, 
        registerActivity: true // Indicar que debe registrarse como actividad de administrador
      });
      
      console.log('Respuesta del servidor:', JSON.stringify(updatedTask, null, 2));
      
      // Actualizar el estado de la tarea con los datos actualizados
      setTask(updatedTask);
      
      // Cerrar el modal de edición
      setShowEditModal(false);
      
      // Mostrar mensaje de éxito
      Alert.alert(t('success'), t('taskUpdatedSuccessfully'));
      
      // Refrescar los detalles de la tarea para obtener la versión más reciente del servidor
      loadTaskDetails();
    } catch (error) {
      console.error('Error al actualizar la tarea:', error);
      Alert.alert(t('error'), t('errorUpdatingTask'));
    } finally {
      setIsUpdatingTask(false);
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
      console.log('Aceptando tarea con ID:', taskId);
      
      // Obtener la fecha actual para el inicio del temporizador
      const now = new Date().toISOString();
      
      // PASO 1: Actualizar el estado de la tarea a "on_the_way" 
      const updatedTask = await api.updateTask(taskId, { 
        status: 'on_the_way',
        acceptedAt: now,
        timeLimitSet: now,  // Establecer el inicio del temporizador
        registerActivity: true // Esto asegura que se registre adecuadamente en el servidor
      });
      
      console.log('Estado actualizado a on_the_way correctamente');
      
      // PASO 2: Registrar explícitamente una actividad de tipo task_accept
      // Esto es fundamental porque el backend eliminó la lógica de registro de actividades
      try {
        await api.saveActivity({
          taskId,
          type: 'task_accept',
          message: 'Tarea aceptada',
          metadata: {
            status: 'on_the_way',
            acceptedAt: now,
            title: task.title || ''
          }
        });
        console.log('Actividad task_accept registrada explícitamente');
      } catch (activityError) {
        console.error('Error al registrar actividad de aceptación:', activityError);
        // Continuamos aunque falle el registro de actividad
      }
      
      // PASO 3: Guardar explícitamente el estado en AsyncStorage como respaldo
      try {
        await AsyncStorage.setItem(`task_${taskId}_status`, 'on_the_way');
        await AsyncStorage.setItem(`task_${taskId}_acceptedAt`, now);
        console.log('Estado de tarea guardado localmente para persistencia');
      } catch (storageError) {
        console.error('Error al guardar estado en AsyncStorage:', storageError);
      }
      
      console.log('Tarea actualizada con éxito:', {
        id: updatedTask._id,
        status: updatedTask.status,
        acceptedAt: updatedTask.acceptedAt,
        timeLimitSet: updatedTask.timeLimitSet
      });
      
      // Registrar actividad explícita de aceptación de tarea
      submitActivity('task_accept', {
        message: 'Tarea aceptada',
        acceptedAt: now
      });
      
      // Actualizar estado local inmediatamente para evitar inconsistencias
      setTask({
        ...task,
        status: 'on_the_way',
        acceptedAt: now,
        timeLimitSet: now
      });
      
      // Iniciar seguimiento de ubicación inmediatamente
      startLocationTracking();
      
      // Marcar que ya se mostró la confirmación para que no vuelva a aparecer
      setHasShownConfirmation(true);
      
      // Guardar permanentemente que esta tarea ya ha sido confirmada
      await saveTaskAsConfirmed();
      
      // Cerrar modal
      setShowTaskConfirmation(false);
      setConfirmationLoading(false);
      
      // El temporizador se iniciará automáticamente en el componente TaskTimer al detectar el cambio de estado
      
      // Notificar al usuario
      Alert.alert(
        t('taskAccepted') || 'Tarea aceptada',
        t('taskAcceptedMessage') || 'Has aceptado esta tarea. Puedes iniciarla cuando estés listo.'
      );
      
      // NO recargamos los detalles de la tarea desde el servidor para evitar
      // que se sobrescriba el estado que acabamos de establecer
      // El estado ya se actualizó localmente en setTask()
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
  
  // Efecto para centrar el mapa en la ubicación de la tarea cuando se carga
  useEffect(() => {
    if (task && task.location && task.location.coordinates && 
        task.location.coordinates.length === 2 && locationComponentRef.current) {
      // Centrar el mapa en la ubicación de la tarea
      locationComponentRef.current.centerOnLocation(
        task.location.coordinates[1], // latitude
        task.location.coordinates[0]  // longitude
      );
    }
  }, [task, locationComponentRef.current]);

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={22} color="#fff3e5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{task ? task.title : t('taskDetails')}</Text>
        <View style={styles.headerRightSection}>
          {user?.isAdmin && task && (
            <TouchableOpacity onPress={() => setShowEditModal(true)} style={styles.headerEditButton}>
              <Ionicons name="create-outline" size={22} color="#fff3e5" />
            </TouchableOpacity>
          )}
          {user?.isAdmin && task && (
            <TouchableOpacity onPress={handleDeleteTask} style={styles.headerDeleteButton}>
              <Ionicons name="trash-outline" size={22} color="#e74c3c" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Timer display section prominently positioned */}
      <TaskTimer task={task} onTimeExpired={handleTimeExpired} />
      
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
              {task.completed 
                ? t('completed') 
                : (() => {
                    // Primero intentamos la traducción con la clave exacta
                    const directTranslation = t(task.status);
                    
                    // Si la traducción es igual a la clave, significa que no encontró traducción
                    // intentamos con la clave sin guiones bajos
                    if (directTranslation === task.status) {
                      // Convertimos waiting_for_acceptance a waitingForAcceptance (formato camelCase)
                      const camelCaseKey = task.status?.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                      return t(camelCaseKey) !== camelCaseKey 
                        ? t(camelCaseKey) 
                        : task.status?.replace(/_/g, ' ');
                    }
                    
                    return directTranslation;
                  })()
              }
            </Text>
          </View>
        </View>
        
        <View style={styles.titleContainer}>
          <View style={styles.titleRow}>
            <View style={styles.titleDateInfo}>
              <View style={styles.headerDateItem}>
                <Ionicons name="create-outline" size={14} color="#777" />
                <Text style={styles.headerDateLabel}>{t('created')}:</Text>
                <Text style={styles.headerDateText}>
                  {task.createdAt ? new Date(task.createdAt).toLocaleString() : t('unknown')}
                </Text>
              </View>
              <View style={styles.headerDateItem}>
                <Ionicons name="refresh-outline" size={14} color="#777" />
                <Text style={styles.headerDateLabel}>{t('updated')}:</Text>
                <Text style={styles.headerDateText}>
                  {task.updatedAt ? new Date(task.updatedAt).toLocaleString() : t('unknown')}
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.infoContainer}>
          {/* Descripción */}
          <View style={styles.infoSectionCard}>
            <View style={styles.infoHeader}>
              <View style={styles.infoHeaderLeft}>
                <Ionicons name="document-text-outline" size={20} color="#444" />
                <Text style={styles.infoHeaderText}>{t('description')}</Text>
              </View>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.description}>{task.description || t('noDescription')}</Text>
            </View>
          </View>
          
        </View>
        
        {hasLocation && (
          <View style={styles.mapContainer}>
            <Text style={styles.mapLabel}>{t('taskLocation')}:</Text>
            <LocationComponent
              ref={locationComponentRef}
              mapOnly={true}
              customHeight={350}
              taskLocation={{
                latitude: task.location.coordinates[1],
                longitude: task.location.coordinates[0],
                title: task.title,
                description: task.description,
                radius: task.radius
              }}
            />
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
                {t('navigateToHere') || 'Navegar hasta aquí'}
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
            onPress={() => {
              if (activityInput.trim() !== '') {
                setPendingActivity(activityInput.trim());
                setShowConfirmModal(true);
              } else {
                Alert.alert(t('error'), t('pleaseEnterActivity'));
              }
            }}
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
                  <View style={styles.keywordContentWrapper}>
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
      
      {/* Modal para editar tarea */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('editTask')}</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#fff3e5" />
              </TouchableOpacity>
            </View>
            
            {/* Usamos solo el selector integrado en el formulario */}
            
            {task && (
              <TaskForm 
                isEditing={true} 
                initialData={{...task, userIds: selectedUserIds.length > 0 ? selectedUserIds : (Array.isArray(task.userIds) ? task.userIds : [])}}
                onSubmit={(updatedTaskData) => {
                  // Asegurarnos de que los usuarios seleccionados se incluyan en los datos
                  const finalData = {
                    ...updatedTaskData,
                    userIds: selectedUserIds.length > 0 ? selectedUserIds : (Array.isArray(task.userIds) ? task.userIds : [])
                  };
                  handleEditTask(finalData);
                }}
                isSubmitting={isUpdatingTask}
                showUserSelector={() => {
                  // Inicializar usuarios seleccionados basado en la tarea actual
                  if (task?.userIds && Array.isArray(task.userIds) && task.userIds.length > 0) {
                    setSelectedUserIds(task.userIds);
                  } else if (task?.userId) {
                    setSelectedUserIds([task.userId]);
                  } else {
                    setSelectedUserIds([]);
                  }
                  setShowUserSelector(true);
                }}
              />
            )}
          </View>
        </View>
      </Modal>
      
      {/* Modal de confirmación para enviar actividad */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('confirmToLog') || 'Confirm to log'}</Text>
              <TouchableOpacity onPress={() => setShowConfirmModal(false)}>
                <Ionicons name="close" size={24} color="#fff3e5" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.confirmModalContent}>
              <View style={styles.activityPreviewContainer}>
                <Text style={styles.activityPreview}>{pendingActivity}</Text>
              </View>
              
              <View style={styles.confirmModalButtonsRow}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setShowConfirmModal(false)}
                >
                  <Ionicons name="close-circle-outline" size={18} color="#ff6b6b" style={styles.buttonIcon} />
                  <Text style={styles.cancelButtonText}>{t('cancel') || 'Cancelar'}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.confirmButton}
                  onPress={() => {
                    setShowConfirmModal(false);
                    submitActivity();
                  }}
                  disabled={isSubmittingActivity}
                >
                  <Text style={styles.confirmButtonText}>{t('confirm') || 'Confirmar'}</Text>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#2e2e2e" style={styles.buttonIcon} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Modal para seleccionar usuarios activos */}
      <Modal
        visible={showUserSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUserSelector(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('selectUsers') || 'Seleccionar usuarios'}</Text>
              <TouchableOpacity onPress={() => setShowUserSelector(false)}>
                <Ionicons name="close" size={24} color="#fff3e5" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.userList}>
              {activeUsers.length > 0 ? (
                activeUsers.map(activeUser => (
                  <TouchableOpacity
                    key={activeUser._id}
                    style={[
                      styles.userItem,
                      selectedUserIds.includes(activeUser._id) && styles.selectedUserItem
                    ]}
                    onPress={() => selectUser(activeUser._id)}
                  >
                    <View style={styles.userItemContent}>
                      <View style={styles.userIcon}>
                        <Ionicons
                          name="person-circle"
                          size={40}
                          color={selectedUserIds.includes(activeUser._id) ? '#4CAF50' : '#fff3e5'}
                        />
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{activeUser.name || activeUser.username || 'Usuario'}</Text>
                        <Text style={styles.userEmail}>{activeUser.email || 'Sin email'}</Text>
                      </View>
                      {selectedUserIds.includes(activeUser._id) && (
                        <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.noUsersText}>{t('noActiveUsers') || 'No hay usuarios activos disponibles'}</Text>
              )}
            </ScrollView>
            
            <View style={styles.userSelectorFooter}>
              <Text style={styles.selectedCountText}>
                {selectedUserIds.length} {t('usersSelected') || 'usuario(s) seleccionado(s)'}
              </Text>
              <TouchableOpacity
                style={styles.confirmSelectionButton}
                onPress={() => setShowUserSelector(false)}
              >
                <Text style={styles.confirmSelectionButtonText}>
                  {t('confirm') || 'Confirmar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 6, // Aún más reducido para que sea muy fino
    backgroundColor: '#2e2e2e',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 243, 229, 0.1)', // Borde sutil para separar
  },
  headerRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackButton: {
    backgroundColor: '#1c1c1c',
    padding: 10,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
    width: 42,
    height: 42,
  },
  headerEditButton: {
    backgroundColor: '#1c1c1c',
    padding: 10,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
    width: 42,
    height: 42,
  },
  headerDeleteButton: {
    backgroundColor: '#1c1c1c',
    padding: 10,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
    width: 42,
    height: 42,
  },
  headerTitle: {
    fontSize: 25, // Tamaño aumentado a 25
    fontWeight: 'bold',
    color: '#fff3e5',
    flex: 1,
    textAlign: 'center',
    marginLeft:10, // Ajuste para compensar el botón de regreso y centrar correctamente
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
    justifyContent: 'center', // Centrar todo el contenido
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
    justifyContent: 'center', // Centrar los elementos dentro del contenedor
    flex: 1, // Ocupar todo el espacio disponible
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
    fontSize: 22, // Tamaño aumentado para destacar el estado
    fontWeight: 'bold',
    color: '#fff3e5',
    textAlign: 'center', // Texto centrado
    textTransform: 'capitalize', // Primera letra en mayúscula
    marginLeft: 5, // Un poco de espacio adicional después del icono de completo
  },
  deleteButton: {
    padding: 8,
  },
  titleContainer: {
    marginVertical: 10,
    marginHorizontal: 10,
    backgroundColor: '#1c1c1c',
    borderRadius: 8,
    padding: 15,
  },
  titleRow: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff3e5',
    marginBottom: 8,
  },
  titleDateInfo: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 243, 229, 0.2)',
  },
  infoContainer: {
    padding: 10,
    marginBottom: 10,
    marginHorizontal: 10,
  },
  infoSectionCard: {
    backgroundColor: '#fff3e5', // Color crema de la app
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  infoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  infoHeaderDates: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  headerDateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerDateLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#d1d1d1',
    marginLeft: 4,
    marginRight: 3,
  },
  headerDateText: {
    fontSize: 11,
    color: '#a0a0a0',
    marginLeft: 2,
  },
  infoContent: {
    padding: 16,
  },
  description: {
    fontSize: 16,
    color: '#222',
    lineHeight: 24,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dateIconContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 8,
    paddingTop: 2,
  },
  dateInfo: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  dateValue: {
    fontSize: 14,
    color: '#222',
    marginTop: 2,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1c1c1c',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff3e5',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#222',
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
    backgroundColor: '#0277bd',
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
    backgroundColor: '#4a4a4a', // Cambiado a fondo gris
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fff3e5', // Mantiene borde color crema
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
  keywordWrapper: {
    marginBottom: 8,
  },
  keywordContentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  keywordCheckmark: {
    marginLeft: 6,
  },
  spokenKeyword: {
    color: '#fff',
    fontWeight: 'bold',
  },
  keywordsList: {
    flexDirection: 'column',
  },
  // Los estilos del temporizador se han movido al componente TaskTimer
  editButton: {
    backgroundColor: 'rgba(255, 243, 229, 0.1)',
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  editButtonText: {
    color: 'rgba(255, 243, 229, 0.9)',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '95%',
    maxHeight: '90%',
    backgroundColor: '#2e2e2e',
    borderRadius: 10,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 243, 229, 0.2)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff3e5',
  },
  // Estilos para selector de usuarios
  userSelectorButton: {
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    marginHorizontal: 10,
  },
  userSelectorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userList: {
    maxHeight: 300,
  },
  userItem: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',
  },
  selectedUserItem: {
    borderColor: '#4CAF50',
    borderWidth: 1,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  userItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userIcon: {
    marginRight: 10,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff3e5',
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 243, 229, 0.7)',
  },
  noUsersText: {
    color: '#fff3e5',
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
  },
  userSelectorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 243, 229, 0.1)',
  },
  selectedCountText: {
    color: '#fff3e5',
    fontSize: 14,
  },
  confirmSelectionButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmSelectionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Estilos para el modal de confirmación de actividades
  confirmModalContent: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 15,
  },
  activityPreviewContainer: {
    backgroundColor: '#1c1c1c',
    padding: 15,
    borderRadius: 10,
    width: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
    marginBottom: 20,
  },
  activityPreview: {
    color: '#fff3e5',
    fontSize: 18,
    fontWeight: '400',
    textAlign: 'center',
  },
  confirmModalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 15,
  },
  cancelButton: {
    backgroundColor: '#1c1c1c',
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '45%',
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  cancelButtonText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  confirmButton: {
    backgroundColor: '#fff3e5',
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '45%',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  confirmButtonText: {
    color: '#2e2e2e',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 5,
  },
});

export default TaskDetailsScreen;