import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { getApiUrl } from '../services/api';
import { useLocationTracking } from './LocationTrackingContext';

const IdleTimeContext = createContext();

export const useIdleTime = () => useContext(IdleTimeContext);

export const IdleTimeProvider = ({ children }) => {
  const [tracking, setTracking] = useState(false);
  const [isInTaskRadius, setIsInTaskRadius] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [stats, setStats] = useState({
    idleTime: 0,
    productiveTime: 0,
    idleMinutes: 0,
    productiveMinutes: 0,
    totalMinutes: 0,
    idlePercentage: 0,
    productivePercentage: 0
  });
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [idleStartTime, setIdleStartTime] = useState(null);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Usar una referencia para evitar problemas durante la inicialización
  const authContext = useAuth();
  const user = authContext?.user;
  const { t } = useLanguage();
  const locationContext = useLocationTracking();
  const lastKnownLocation = locationContext?.lastKnownLocation;
  const locations = locationContext?.locations || [];
  
  const intervalRef = useRef(null);
  const appState = useRef(AppState.currentState);
  
  // Función para obtener el token de autenticación
  const getAuthToken = async () => {
    try {
      return await AsyncStorage.getItem('token');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };
  
  // Función para iniciar el seguimiento de tiempo
  const startTracking = async () => {
    try {
      // Solo iniciar si tenemos usuario
      if (!user) {
        setError('No hay usuario autenticado');
        return false;
      }
      
      const token = await getAuthToken();
      if (!token) {
        setError('No hay token de autenticación');
        return false;
      }
      
      // Iniciar la sesión en el backend
      const response = await fetch(`${getApiUrl()}/api/idle-time/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al iniciar seguimiento de tiempo');
      }
      
      const data = await response.json();
      
      // Establecer estado local
      setTracking(true);
      setSessionStartTime(new Date());
      setIdleStartTime(new Date());
      setIsInTaskRadius(false);
      setCurrentTask(null);
      
      // Iniciar verificación periódica de tareas cercanas
      if (intervalRef.current === null) {
        intervalRef.current = setInterval(checkNearbyTasks, 60000); // Cada 1 minuto
      }
      
      // Verificar inmediatamente
      await checkNearbyTasks();
      
      return true;
    } catch (error) {
      console.error('Error al iniciar seguimiento de tiempo:', error);
      setError(`Error al iniciar seguimiento: ${error.message}`);
      return false;
    }
  };
  
  // Función para detener el seguimiento de tiempo
  const stopTracking = async () => {
    try {
      if (!tracking) {
        return true;
      }
      
      const token = await getAuthToken();
      if (!token) {
        setError('No hay token de autenticación');
        return false;
      }
      
      // Finalizar la sesión en el backend
      const response = await fetch(`${getApiUrl()}/api/idle-time/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al detener seguimiento de tiempo');
      }
      
      // Limpiar estado local
      setTracking(false);
      setSessionStartTime(null);
      setIdleStartTime(null);
      setIsInTaskRadius(false);
      setCurrentTask(null);
      
      // Detener intervalo
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      return true;
    } catch (error) {
      console.error('Error al detener seguimiento de tiempo:', error);
      setError(`Error al detener seguimiento: ${error.message}`);
      return false;
    }
  };
  
  // Función para obtener estadísticas actuales
  const getStats = async () => {
    try {
      if (!user) {
        return;
      }
      
      const token = await getAuthToken();
      if (!token) {
        return;
      }
      
      const response = await fetch(`${getApiUrl()}/api/idle-time/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al obtener estadísticas de tiempo');
      }
      
      const data = await response.json();
      
      if (data.success && data.stats) {
        setStats(data.stats);
        
        // Actualizar estado actual si hay una sesión activa
        if (data.stats.hasActiveSession) {
          setTracking(true);
          setIsInTaskRadius(data.stats.isInTaskRadius);
          setCurrentTask(data.stats.currentTask);
        }
      }
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
    }
  };
  
  // Función para verificar si el usuario está dentro del radio de alguna tarea
  const checkNearbyTasks = async () => {
    try {
      console.log('⏱️ IdleTime: Verificando tareas cercanas...');
      
      if (!lastKnownLocation || !lastKnownLocation.coords) {
        console.log('⏱️ IdleTime: No hay ubicación disponible, omitiendo verificación');
        return;
      }
      
      const token = await getAuthToken();
      if (!token) {
        console.log('⏱️ IdleTime: No hay token de autenticación, omitiendo verificación');
        return;
      }
      
      console.log(`⏱️ IdleTime: Estado de tracking: ${tracking ? 'ACTIVO' : 'INACTIVO'}`);
      // Continuar incluso si tracking es falso, ya que lo iniciaremos automáticamente
      
      // Iniciar el rastreo si no está activo
      if (!tracking) {
        console.log('⏱️ IdleTime: Iniciando rastreo automáticamente');
        await startTracking().catch(err => {
          console.error('⏱️ IdleTime: Error al iniciar rastreo:', err);
        });
      }

      // Obtener tareas cercanas
      const { latitude, longitude } = lastKnownLocation.coords;
      console.log(`⏱️ IdleTime: Consultando tareas cerca de ${latitude}, ${longitude}`);

      const response = await fetch(
        `${getApiUrl()}/api/tasks/nearby?latitude=${latitude}&longitude=${longitude}&maxDistance=1000`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Error al obtener tareas cercanas');
      }
      
      const tasks = await response.json();
      console.log(`⏱️ IdleTime: Se encontraron ${tasks.length} tareas cercanas`);
      
      // Verificar si está dentro del radio de alguna tarea
      let foundInRadius = false;
      let closestTask = null;
      let minDistance = Infinity;
      
      for (const task of tasks) {
        if (task.location && task.location.coordinates && task.radius) {
          const taskLat = task.location.coordinates[1];
          const taskLng = task.location.coordinates[0];
          const taskRadius = task.radius * 1000; // Convertir de km a metros si es necesario
          
          // Calcular distancia en metros
          const distance = getDistanceFromLatLonInMeters(
            latitude,
            longitude,
            taskLat,
            taskLng
          );
          
          console.log(`⏱️ IdleTime: Tarea ${task._id}: Distancia=${distance}m, Radio=${taskRadius}m, Título="${task.title}"`);
          
          // Si está dentro del radio
          if (distance <= taskRadius) {
            foundInRadius = true;
            console.log(`⏱️ IdleTime: ✅ Usuario DENTRO del radio de la tarea "${task.title}"`);
            
            // Guardar la tarea más cercana
            if (distance < minDistance) {
              minDistance = distance;
              closestTask = task;
              console.log(`⏱️ IdleTime: Tarea más cercana actualizada: "${task.title}" a ${distance}m`);
            }
          } else {
            console.log(`⏱️ IdleTime: ❌ Usuario FUERA del radio de la tarea "${task.title}"`);
          }
        } else {
          console.log(`⏱️ IdleTime: Tarea ${task._id} no tiene ubicación o radio válidos`);
        }
      }
      
      // Verificar si el estado cambió
      const stateChanged = foundInRadius !== isInTaskRadius;
      const taskChanged = foundInRadius && closestTask && (!currentTask || closestTask._id !== currentTask._id);
      
      console.log(`⏱️ IdleTime: Estado actual - En radio: ${isInTaskRadius}, Tarea: ${currentTask?.title || 'ninguna'}`);
      console.log(`⏱️ IdleTime: Nuevo estado - En radio: ${foundInRadius}, Tarea: ${closestTask?.title || 'ninguna'}`);
      console.log(`⏱️ IdleTime: ¿Cambió el estado? ${stateChanged ? 'SÍ' : 'NO'}, ¿Cambió la tarea? ${taskChanged ? 'SÍ' : 'NO'}`);
      
      // Si el estado cambió, actualizar en el backend
      if (stateChanged || taskChanged) {
        console.log('⏱️ IdleTime: Detectado cambio de estado o tarea, actualizando...');
        
        const updateData = {
          isInTaskRadius: foundInRadius,
          taskId: foundInRadius && closestTask ? closestTask._id : null
        };
        
        try {
          console.log(`⏱️ IdleTime: Enviando actualización al servidor: ${JSON.stringify(updateData)}`);
          
          const updateResponse = await fetch(`${getApiUrl()}/api/idle-time/update-radius`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
          });
          
          if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(`Error al actualizar estado de radio: ${errorData.message || updateResponse.status}`);
          }
          
          const responseData = await updateResponse.json();
          console.log(`⏱️ IdleTime: Respuesta del servidor: ${JSON.stringify(responseData)}`);
          
          // Actualizar estado local
          setIsInTaskRadius(foundInRadius);
          setCurrentTask(foundInRadius ? closestTask : null);
          
          // Si pasó de estar fuera a dentro, notificar
          if (!isInTaskRadius && foundInRadius) {
            console.log(`⏱️ IdleTime: ✨ Usuario ENTRÓ en radio de tarea: ${closestTask.title}`);
            console.log('⏱️ IdleTime: PAUSANDO contador de tiempo idle');
          } 
          // Si pasó de estar dentro a fuera, actualizar tiempo de inicio idle
          else if (isInTaskRadius && !foundInRadius) {
            console.log('⏱️ IdleTime: ✨ Usuario SALIÓ del radio de tarea');
            console.log('⏱️ IdleTime: INICIANDO contador de tiempo idle');
            setIdleStartTime(new Date());
          }
          
          // Actualizar estadísticas
          await getStats();
          console.log('⏱️ IdleTime: Estadísticas actualizadas después del cambio de estado');
        } catch (error) {
          console.error('⏱️ IdleTime: Error al actualizar estado:', error);
          // Intentar recuperarse del error - reintentar getStats
          try {
            await getStats();
          } catch (statsError) {
            console.error('⏱️ IdleTime: Error al recuperar estadísticas:', statsError);
          }
        }
      } else {
        console.log('⏱️ IdleTime: No hay cambios en el estado o tarea, omitiendo actualización');
      }
    } catch (error) {
      console.error('Error al verificar tareas cercanas:', error);
    }
  };
  
  // Función para calcular distancia entre dos puntos (Haversine)
  const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distancia en metros
    return distance;
  };
  
  const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
  };
  
  // Escuchar cambios en la ubicación para verificar tareas cercanas
  useEffect(() => {
    // Verificar tareas cercanas cada vez que cambie la ubicación, independientemente del estado de tracking
    if (lastKnownLocation && lastKnownLocation.coords) {
      console.log(`⏱️ IdleTime: Nueva ubicación detectada: ${lastKnownLocation.coords.latitude}, ${lastKnownLocation.coords.longitude}`);
      checkNearbyTasks().catch(err => {
        console.error('⏱️ IdleTime: Error al verificar tareas cercanas tras cambio de ubicación:', err);
      });
    }
  }, [lastKnownLocation]);
  
  // Comprobar si estamos listos para inicializar
  useEffect(() => {
    const isAuthReady = authContext !== undefined && authContext !== null;
    const isLocationReady = locationContext !== undefined && locationContext !== null;
    
    if (isAuthReady && isLocationReady) {
      setIsInitialized(true);
      console.log('IdleTimeContext inicializado correctamente');
      
      // Verificar tareas cercanas inmediatamente
      checkNearbyTasks().catch(err => {
        console.error('Error en verificación inicial de tareas cercanas:', err);
      });
      
      // Configurar verificación periódica cada 15 segundos
      if (intervalRef.current === null) {
        intervalRef.current = setInterval(() => {
          checkNearbyTasks().catch(err => {
            console.error('Error en verificación periódica de tareas cercanas:', err);
          });
        }, 15000); // Cada 15 segundos en lugar de 60 segundos
        console.log('Verificación periódica de tareas cercanas configurada (cada 15s)');
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log('Verificación periódica de tareas cercanas detenida');
      }
    };
  }, [authContext, locationContext]);
  
  // Iniciar automáticamente el seguimiento cuando el usuario inicia sesión
  useEffect(() => {
    // Solo ejecutar si estamos inicializados
    if (!isInitialized) {
      return;
    }
    
    // Verificar si user existe y es válido antes de proceder
    if (user && (user.id || user._id)) {
      console.log('Usuario autenticado, iniciando seguimiento de tiempo idle automáticamente');
      startTracking().catch(err => {
        console.error('Error al iniciar tracking:', err);
      });
      getStats().catch(err => {
        console.error('Error al obtener estadísticas:', err);
      });
    } else if (tracking) {
      // Si no hay usuario válido pero el tracking está activo, detenerlo
      stopTracking().catch(err => {
        console.error('Error al detener tracking:', err);
      });
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user, isInitialized]);
  
  // Manejar cambios en el estado de la aplicación
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App volviendo a primer plano
        if (tracking) {
          await checkNearbyTasks();
          await getStats();
        }
      }
      
      appState.current = nextAppState;
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [tracking]);
  
  return (
    <IdleTimeContext.Provider value={{
      tracking,
      isInTaskRadius,
      currentTask,
      stats,
      sessionStartTime,
      idleStartTime,
      error,
      startTracking,
      stopTracking,
      getStats
    }}>
      {children}
    </IdleTimeContext.Provider>
  );
};
