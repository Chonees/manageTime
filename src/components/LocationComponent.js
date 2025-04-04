import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import { mapConfig } from '../services/platform-config';
import VerificationPrompt from './VerificationPrompt';

const LocationComponent = ({ onLocationChange, showWorkControls = false }) => {
  const { user } = useAuth();
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [workStartTime, setWorkStartTime] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  const getLocation = async () => {
    setLoading(true);
    setErrorMsg(null);
    
    try {
      console.log('Requesting location permissions...');
      // Request permission to access location
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('Permission status:', status);
      
      const isGranted = status === 'granted';
      setPermissionGranted(isGranted);
      
      if (!isGranted) {
        setErrorMsg('Esta aplicación requiere acceso a tu ubicación para funcionar. Por favor, habilita los servicios de ubicación en la configuración de tu dispositivo.');
        setLoading(false);
        return;
      }
      
      // Verificar si los servicios de ubicación están habilitados
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        setErrorMsg('Los servicios de ubicación están desactivados. Por favor, actívalos en la configuración de tu dispositivo.');
        setLoading(false);
        return;
      }
      
      console.log('Getting current position...');
      
      // Importar la configuración de la plataforma
      const { getPlatformConfig, getPlatformOptions } = require('../services/platform-config');
      const locationConfig = getPlatformConfig('location');
      const platformOptions = getPlatformOptions('location');
      
      // Opciones para obtener la ubicación
      const options = {
        accuracy: Location.Accuracy[Platform.OS === 'android' ? 'Balanced' : 'BestForNavigation'],
        timeout: locationConfig.timeout || 20000,
        maximumAge: locationConfig.maximumAge || 10000,
        ...platformOptions
      };
      
      console.log('Location options:', JSON.stringify(options));
      const currentLocation = await Location.getCurrentPositionAsync(options);
      
      console.log('Location received:', currentLocation ? JSON.stringify(currentLocation.coords) : 'null');
      
      if (!currentLocation) {
        throw new Error('Location data is null');
      }
      
      if (!currentLocation.coords || 
          typeof currentLocation.coords.latitude !== 'number' || 
          typeof currentLocation.coords.longitude !== 'number') {
        throw new Error('Coordenadas inválidas o incompletas');
      }
      
      setLocation(currentLocation);
      
      // Notify parent component about location update
      if (onLocationChange) {
        onLocationChange(currentLocation);
      }
    } catch (error) {
      console.error('Location error:', error);
      setErrorMsg('No se pudo obtener la ubicación: ' + (error.message || 'Error desconocido'));
      
      // Intentar con una precisión menor si falla
      if (error.message && (error.message.includes('timeout') || error.message.includes('location'))) {
        try {
          console.log('Intentando con precisión menor...');
          const lowAccuracyLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
            timeout: 10000
          });
          
          if (lowAccuracyLocation && 
              lowAccuracyLocation.coords && 
              typeof lowAccuracyLocation.coords.latitude === 'number' && 
              typeof lowAccuracyLocation.coords.longitude === 'number') {
            
            console.log('Ubicación obtenida con precisión menor:', JSON.stringify(lowAccuracyLocation.coords));
            setLocation(lowAccuracyLocation);
            setErrorMsg(null);
            
            if (onLocationChange) {
              onLocationChange(lowAccuracyLocation);
            }
          }
        } catch (fallbackError) {
          console.error('Error en fallback de ubicación:', fallbackError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Efecto para obtener la ubicación al montar el componente
  useEffect(() => {
    let isMounted = true;
    let locationSubscription = null;
    
    const setupLocation = async () => {
      try {
        // Obtener la ubicación inicial
        await getLocation();
        
        // Configurar actualizaciones de ubicación en tiempo real
        if (isMounted) {
          // Importar la configuración de la plataforma
          const { getPlatformConfig, getPlatformOptions } = require('../services/platform-config');
          const locationConfig = getPlatformConfig('location');
          const platformOptions = getPlatformOptions('location');
          
          // Opciones para la suscripción de ubicación
          const watchOptions = {
            accuracy: Location.Accuracy[Platform.OS === 'android' ? 'Balanced' : 'BestForNavigation'],
            distanceInterval: Platform.OS === 'android' ? 5 : 10, // Metros
            timeInterval: Platform.OS === 'android' ? 5000 : 10000, // Milisegundos
            ...platformOptions
          };
          
          console.log('Configurando watch position con opciones:', JSON.stringify(watchOptions));
          
          locationSubscription = await Location.watchPositionAsync(
            watchOptions,
            (newLocation) => {
              if (isMounted) {
                console.log('Nueva ubicación recibida (watch):', JSON.stringify(newLocation.coords));
                setLocation(newLocation);
                
                if (onLocationChange) {
                  onLocationChange(newLocation);
                }
              }
            }
          );
        }
      } catch (error) {
        console.error('Error al configurar la ubicación:', error);
      }
    };
    
    setupLocation();
    
    // Limpiar al desmontar
    return () => {
      isMounted = false;
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  // Check if user is currently working
  const checkWorkStatus = async () => {
    try {
      // En una implementación real, esto sería una llamada a la API
      // const status = await api.getWorkStatus();
      // setIsWorking(status.isWorking);
      // if (status.isWorking && status.startTime) {
      //   setWorkStartTime(new Date(status.startTime));
      // }
      
      // Simulación para desarrollo
      setIsWorking(false);
      setWorkStartTime(null);
    } catch (error) {
      console.error('Error checking work status:', error);
    }
  };

  // Verificar el estado de trabajo cuando se muestran los controles
  useEffect(() => {
    if (showWorkControls) {
      checkWorkStatus();
    }
  }, [showWorkControls]);

  // Función para iniciar trabajo
  const handleStartWork = async () => {
    console.log('Iniciando trabajo, location:', location);
    
    if (!location) {
      Alert.alert('Error', 'No se puede iniciar el trabajo sin ubicación');
      return;
    }
    
    if (!location.coords || typeof location.coords.latitude !== 'number' || typeof location.coords.longitude !== 'number') {
      console.error('Coordenadas inválidas:', location.coords);
      Alert.alert('Error', 'Coordenadas inválidas. Por favor, actualiza tu ubicación e intenta nuevamente.');
      return;
    }
    
    try {
      setLoadingAction(true);
      
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      
      console.log('Enviando coordenadas al servidor:', coords);
      
      await api.startWork(coords);
      
      setIsWorking(true);
      setWorkStartTime(new Date());
      
      Alert.alert('Éxito', 'Has iniciado tu jornada de trabajo');
    } catch (error) {
      console.error('Error al iniciar trabajo:', error);
      Alert.alert('Error', error.message || 'No se pudo iniciar el trabajo');
    } finally {
      setLoadingAction(false);
    }
  };

  // Función para finalizar trabajo
  const handleEndWork = async () => {
    console.log('Finalizando trabajo, location:', location);
    
    if (!location) {
      Alert.alert('Error', 'No se puede finalizar el trabajo sin ubicación');
      return;
    }
    
    if (!location.coords || typeof location.coords.latitude !== 'number' || typeof location.coords.longitude !== 'number') {
      console.error('Coordenadas inválidas:', location.coords);
      Alert.alert('Error', 'Coordenadas inválidas. Por favor, actualiza tu ubicación e intenta nuevamente.');
      return;
    }
    
    try {
      setLoadingAction(true);
      
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      
      console.log('Enviando coordenadas al servidor:', coords);
      
      await api.endWork(coords);
      
      setIsWorking(false);
      setWorkStartTime(null);
      
      Alert.alert('Éxito', 'Has finalizado tu jornada de trabajo');
    } catch (error) {
      console.error('Error al finalizar trabajo:', error);
      Alert.alert('Error', error.message || 'No se pudo finalizar el trabajo');
    } finally {
      setLoadingAction(false);
    }
  };

  // Formatear tiempo de trabajo
  const formatWorkTime = () => {
    if (!workStartTime) return '00:00:00';
    
    const now = new Date();
    const diff = now - workStartTime;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Actualizar tiempo cada segundo si está trabajando
  useEffect(() => {
    let interval;
    
    if (isWorking && workStartTime) {
      interval = setInterval(() => {
        // Forzar actualización del componente
        setWorkStartTime(prevTime => new Date(prevTime.getTime()));
      }, 500);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isWorking, workStartTime]);

  // Manejar errores del mapa
  const handleMapError = (error) => {
    console.error('Error en el mapa:', error);
    setMapError(true);
    Alert.alert(
      'Error en el mapa',
      'No se pudo cargar el mapa. Se mostrará una vista alternativa.',
      [{ text: 'OK' }]
    );
  };

  // Manejar fallo de verificación
  const handleVerificationFailed = () => {
    Alert.alert(
      'Verificación fallida',
      'No has respondido a tiempo. Tu sesión de trabajo se finalizará automáticamente.',
      [{ text: 'OK' }],
      { cancelable: false }
    );
    
    // Finalizar trabajo automáticamente
    handleEndWork();
  };

  // Render different content based on state
  let content;
  
  if (loading) {
    content = (
      <View style={styles.messageContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.messageText}>Obteniendo tu ubicación...</Text>
      </View>
    );
  } else if (errorMsg) {
    content = (
      <View style={styles.messageContainer}>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, {marginTop: 10}]} 
          onPress={getLocation}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (location) {
    // Ensure location coordinates are valid numbers
    const latitude = typeof location.coords.latitude === 'number' ? location.coords.latitude : 0;
    const longitude = typeof location.coords.longitude === 'number' ? location.coords.longitude : 0;
    
    // Si hay un error con el mapa, mostrar la vista alternativa
    if (mapError) {
      content = (
        <View style={styles.locationInfoContainer}>
          <View style={styles.mapContainer}>
            <View style={styles.map}>
              <Text style={styles.locationText}>
                Latitud: {latitude.toFixed(6)}, Longitud: {longitude.toFixed(6)}
              </Text>
            </View>
          </View>
          
          {showWorkControls && (
            <View style={styles.workControlsContainer}>
              {isWorking ? (
                <>
                  <View style={styles.workTimeContainer}>
                    <Text style={styles.workTimeLabel}>Tiempo de trabajo:</Text>
                    <Text style={styles.workTimeValue}>{formatWorkTime()}</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.workButton, styles.endWorkButton]}
                    onPress={handleEndWork}
                    disabled={loadingAction}
                  >
                    <Text style={styles.workButtonText}>
                      {loadingAction ? 'Finalizando...' : 'Finalizar Trabajo'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity 
                  style={[styles.workButton, styles.startWorkButton]}
                  onPress={handleStartWork}
                  disabled={loadingAction}
                >
                  <Text style={styles.workButtonText}>
                    {loadingAction ? 'Iniciando...' : 'Iniciar Trabajo'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      );
    } else {
      content = (
        <View style={styles.locationInfoContainer}>
          {/* Renderizado del mapa para ambas plataformas */}
          <View style={styles.mapContainer}>
            <MapView 
              style={styles.map}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : null}
              initialRegion={{
                latitude: latitude,
                longitude: longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
              showsUserLocation={mapConfig.showsUserLocation}
              showsMyLocationButton={mapConfig.showsMyLocationButton}
              toolbarEnabled={Platform.OS === 'android' ? mapConfig.toolbarEnabled : undefined}
              showsCompass={Platform.OS === 'ios' ? mapConfig.showsCompass : undefined}
              onMapReady={() => setMapReady(true)}
              onError={handleMapError}
            >
              {mapReady && (
                <Marker
                  coordinate={{
                    latitude: latitude,
                    longitude: longitude,
                  }}
                  title="Mi ubicación"
                  description="Estoy aquí"
                />
              )}
            </MapView>
          </View>
          
          {showWorkControls && (
            <View style={styles.workControlsContainer}>
              {isWorking ? (
                <>
                  <View style={styles.workTimeContainer}>
                    <Text style={styles.workTimeLabel}>Tiempo de trabajo:</Text>
                    <Text style={styles.workTimeValue}>{formatWorkTime()}</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.workButton, styles.endWorkButton]}
                    onPress={handleEndWork}
                    disabled={loadingAction}
                  >
                    <Text style={styles.workButtonText}>
                      {loadingAction ? 'Finalizando...' : 'Finalizar Trabajo'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity 
                  style={[styles.workButton, styles.startWorkButton]}
                  onPress={handleStartWork}
                  disabled={loadingAction}
                >
                  <Text style={styles.workButtonText}>
                    {loadingAction ? 'Iniciando...' : 'Iniciar Trabajo'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      );
    }
  } else {
    content = (
      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>No se pudo obtener la ubicación.</Text>
        <TouchableOpacity 
          style={[styles.retryButton, {marginTop: 10}]} 
          onPress={getLocation}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Mi Ubicación</Text>
        </View>
        {content}
        {user?.isAdmin && (
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={getLocation}
            disabled={loading}
          >
            <Text style={styles.refreshButtonText}>
              {loading ? 'Actualizando...' : 'Actualizar Ubicación'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Componente de verificación periódica */}
      <VerificationPrompt 
        isWorking={isWorking} 
        onVerificationFailed={handleVerificationFailed} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    backgroundColor: '#4A90E2',
    padding: 15,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  messageContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
  },
  locationInfoContainer: {
    padding: 20,
  },
  mapContainer: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginBottom: 15,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  map: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  locationText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 5,
    textAlign: 'center',
  },
  refreshButton: {
    backgroundColor: '#4A90E2',
    padding: 12,
    alignItems: 'center',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  workControlsContainer: {
    marginTop: 10,
  },
  workButton: {
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  startWorkButton: {
    backgroundColor: '#2ecc71',
  },
  endWorkButton: {
    backgroundColor: '#e74c3c',
  },
  workButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  workTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 5,
  },
  workTimeLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  workTimeValue: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: 'bold',
  },
});

export default LocationComponent;