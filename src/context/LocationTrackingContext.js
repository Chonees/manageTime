import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState, DeviceEventEmitter } from 'react-native';
import { getApiUrl } from '../services/api';

const LocationTrackingContext = createContext();

export const useLocationTracking = () => useContext(LocationTrackingContext);

export const LocationTrackingProvider = ({ children }) => {
  const [tracking, setTracking] = useState(false);
  const [lastKnownLocation, setLastKnownLocation] = useState(null);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const locationSubscription = useRef(null);

  // Función para obtener el token de autenticación
  const getAuthToken = async () => {
    try {
      return await AsyncStorage.getItem('token');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  // Función para enviar la ubicación al backend
  const sendLocationToBackend = async (location) => {
    try {
      // Solo enviar si tenemos una ubicación válida
      if (!location || !location.coords) {
        console.log('No hay ubicación válida para enviar');
        return;
      }
      
      const token = await getAuthToken();
      if (!token) {
        console.error('No hay token de autenticación disponible');
        return;
      }
      
      const url = `${getApiUrl()}/api/locations/real-time`;
      
      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        heading: location.coords.heading,
        speed: location.coords.speed,
        timestamp: location.timestamp || new Date().toISOString()
      };
      
      console.log('Enviando ubicación en tiempo real al backend:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(locationData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error al enviar ubicación:', errorText);
      } else {
        console.log('Ubicación enviada correctamente');
      }
    } catch (error) {
      console.error('Error al enviar la ubicación al backend:', error);
    }
  };

  // Función para obtener y procesar la ubicación actual
  const updateLocation = async () => {
    try {
      // Verificar permisos primero
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permisos de ubicación no concedidos');
        return;
      }
      
      // Configuración para la precisión de la ubicación
      const options = {
        accuracy: Platform.OS === 'android' ? 
          Location.Accuracy.Balanced : 
          Location.Accuracy.BestForNavigation,
        timeInterval: 15000,
        distanceInterval: 10
      };
      
      // Obtener la ubicación actual
      const currentLocation = await Location.getCurrentPositionAsync(options);
      
      if (currentLocation && currentLocation.coords) {
        console.log('Nueva ubicación obtenida:', 
          `Lat: ${currentLocation.coords.latitude.toFixed(6)}, ` + 
          `Lng: ${currentLocation.coords.longitude.toFixed(6)}`);
        
        setLastKnownLocation(currentLocation);
        setLocations(prev => [...prev.slice(-9), currentLocation.coords]); // Mantener solo últimas 10 ubicaciones
        
        // Enviar la ubicación al backend
        await sendLocationToBackend(currentLocation);
      }
    } catch (e) {
      console.error('Error al actualizar la ubicación:', e);
      setError(e.message);
    }
  };

  // Iniciar el rastreo de ubicación
  const startTracking = async () => {
    if (tracking) return;
    
    try {
      console.log('Iniciando rastreo de ubicación...');
      
      // Solicitar permisos de ubicación
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Permiso de ubicación denegado');
        setError('Se requiere permiso de ubicación para rastrear la posición');
        return;
      }
      
      // Verificar si los servicios de ubicación están habilitados
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        console.log('Servicios de ubicación deshabilitados');
        setError('Los servicios de ubicación están deshabilitados');
        return;
      }
      
      // Obtener la ubicación inicial inmediatamente
      await updateLocation();
      
      // Configurar actualización periódica
      if (intervalRef.current === null) {
        intervalRef.current = setInterval(updateLocation, 30000); // Cada 30 segundos
      }
      
      // Configurar suscripción en tiempo real para mayor precisión
      if (Platform.OS === 'ios') {
        if (locationSubscription.current) {
          locationSubscription.current.remove();
        }
        
        locationSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 10,
            timeInterval: 15000
          },
          async (newLocation) => {
            setLastKnownLocation(newLocation);
            setLocations(prev => [...prev.slice(-9), newLocation.coords]);
            await sendLocationToBackend(newLocation);
          }
        );
      }
      
      setTracking(true);
      setError(null);
      console.log('Rastreo de ubicación iniciado correctamente');
    } catch (e) {
      console.error('Error al iniciar el rastreo:', e);
      setError(`Error al iniciar rastreo: ${e.message}`);
    }
  };

  // Iniciar rastreo automáticamente cuando se recibe el evento
  const handleStartTrackingEvent = async () => {
    console.log('Evento de inicio de rastreo recibido');
    await startTracking();
  };

  // Detener el rastreo de ubicación
  const stopTracking = () => {
    console.log('Deteniendo rastreo de ubicación...');
    
    setTracking(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    
    console.log('Rastreo de ubicación detenido');
  };

  // Manejar cambios en el estado de la aplicación (primer plano/segundo plano)
  // Escuchar el evento START_LOCATION_TRACKING
  useEffect(() => {
    console.log('Configurando oyente para eventos de rastreo de ubicación');
    
    // Suscribirse al evento START_LOCATION_TRACKING
    const subscription = DeviceEventEmitter.addListener(
      'START_LOCATION_TRACKING',
      handleStartTrackingEvent
    );
    
    // Limpieza al desmontar
    return () => {
      console.log('Eliminando suscripción a eventos de rastreo');
      subscription.remove();
    };
  }, []);

  // Manejar cambios en el estado de la aplicación
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App pasando a segundo plano - podríamos ajustar la frecuencia de actualización aquí
        console.log('App pasando a segundo plano. Manteniendo rastreo con menor frecuencia.');
      } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App volviendo a primer plano - actualizar ubicación inmediatamente
        console.log('App volviendo a primer plano. Actualizando ubicación...');
        if (tracking) {
          updateLocation();
        }
      }
      
      appState.current = nextAppState;
    };

    // Suscribirse a cambios de estado de la aplicación
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Limpieza al desmontar
    return () => {
      subscription.remove();
      stopTracking();
    };
  }, [tracking]);

  return (
    <LocationTrackingContext.Provider value={{ 
      tracking, 
      locations, 
      lastKnownLocation,
      error,
      startTracking, 
      stopTracking,
      updateLocation
    }}>
      {children}
    </LocationTrackingContext.Provider>
  );
};
