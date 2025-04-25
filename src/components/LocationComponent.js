import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useLocationTracking } from '../context/LocationTrackingContext';
import * as api from '../services/api';
import { mapConfig } from '../services/platform-config';
import VerificationPrompt from './VerificationPrompt';

const LocationComponent = ({ 
  onLocationChange, 
  showWorkControls = false, 
  mapOnly = false,
  customHeight,
  transparentContainer = false 
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { startTracking, stopTracking } = useLocationTracking();
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
        setErrorMsg(t('locationPermissionRequired'));
        setLoading(false);
        return;
      }
      
      // Verificar si los servicios de ubicación están habilitados
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        setErrorMsg(t('locationServicesDisabled'));
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
        throw new Error(t('invalidCoordinates'));
      }
      
      setLocation(currentLocation);
      
      // Notify parent component about location update
      if (onLocationChange) {
        onLocationChange(currentLocation);
      }
    } catch (error) {
      console.error('Location error:', error);
      setErrorMsg(t('locationError') + ': ' + (error.message || t('unknownError')));
      
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
      Alert.alert(t('error'), t('noLocationError'));
      return;
    }
    
    if (!location.coords || typeof location.coords.latitude !== 'number' || typeof location.coords.longitude !== 'number') {
      console.error('Coordenadas inválidas:', location.coords);
      Alert.alert(t('error'), t('invalidCoordinates'));
      return;
    }
    
    try {
      setLoadingAction(true);
      
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      
      console.log('Enviando coordenadas al servidor:', coords);
      
      // Start work and location tracking
      await api.startWork(coords);
      startTracking();
      setIsWorking(true);
      setWorkStartTime(new Date());
      
      Alert.alert(t('success'), t('workStarted'));
    } catch (error) {
      console.error('Error al iniciar trabajo:', error);
      Alert.alert(t('error'), error.message || t('errorStartingWork'));
    } finally {
      setLoadingAction(false);
    }
  };

  // Función para finalizar trabajo
  const handleEndWork = async () => {
    console.log('Finalizando trabajo, location:', location);
    
    if (!location) {
      Alert.alert(t('error'), t('noLocationError'));
      return;
    }
    
    if (!location.coords || typeof location.coords.latitude !== 'number' || typeof location.coords.longitude !== 'number') {
      console.error('Coordenadas inválidas:', location.coords);
      Alert.alert(t('error'), t('invalidCoordinates'));
      return;
    }
    
    try {
      setLoadingAction(true);
      
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      
      console.log('Enviando coordenadas al servidor:', coords);
      
      // End work and stop location tracking
      await api.endWork(coords);
      stopTracking();
      setIsWorking(false);
      setWorkStartTime(null);
      
      Alert.alert(t('success'), t('workEnded'));
    } catch (error) {
      console.error('Error al finalizar trabajo:', error);
      Alert.alert(t('error'), error.message || t('errorEndingWork'));
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

  // Validate coordinates to ensure they are valid numbers
  const validateCoordinates = (coords) => {
    if (!coords) return false;
    const lat = coords.latitude || coords.coords?.latitude;
    const lng = coords.longitude || coords.coords?.longitude;
    return (
      typeof lat === 'number' && 
      !isNaN(lat) && 
      typeof lng === 'number' && 
      !isNaN(lng)
    );
  };

  // Aplicar la altura personalizada al mapa si se proporciona
  const mapStyle = [
    styles.map,
    customHeight ? { height: customHeight } : null
  ];

  // Render different content based on state
  let content;
  
  if (loading) {
    content = (
      <View style={styles.messageContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.messageText}>{t('loadingLocation')}</Text>
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
          <Text style={styles.retryButtonText}>{t('retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (location) {
    // Ensure location coordinates are valid numbers
    const latitude = Number(location.coords?.latitude) || 0;
    const longitude = Number(location.coords?.longitude) || 0;
    
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
            <View style={styles.workControls}>
              {isWorking ? (
                <View style={styles.workStatus}>
                  <Text style={styles.workStatusText}>{t('workingSince')} {formatWorkTime()}</Text>
                  <TouchableOpacity
                    style={[styles.workButton, styles.stopButton]}
                    onPress={handleEndWork}
                    disabled={loadingAction}
                  >
                    <Text style={styles.workButtonText}>{t('endWork')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.workButton, styles.startButton]}
                  onPress={handleStartWork}
                  disabled={loadingAction}
                >
                  <Text style={styles.workButtonText}>{t('startWork')}</Text>
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
            {Platform.OS === 'ios' ? (
              // iOS specific rendering to avoid undefined errors
              <MapView 
                style={mapStyle}
                initialRegion={{
                  latitude: Number(latitude) || 0,
                  longitude: Number(longitude) || 0,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                }}
                region={{
                  latitude: Number(latitude) || 0,
                  longitude: Number(longitude) || 0,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                }}
                showsUserLocation={true}
                showsMyLocationButton={true}
                showsCompass={true}
                onMapReady={() => setMapReady(true)}
                onError={handleMapError}
              >
                {mapReady && validateCoordinates({latitude, longitude}) && (
                  <Marker
                    coordinate={{
                      latitude: Number(latitude),
                      longitude: Number(longitude),
                    }}
                    title={t('yourLocation')}
                  />
                )}
              </MapView>
            ) : (
              // Android rendering
              <MapView 
                style={mapStyle}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: latitude,
                  longitude: longitude,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                }}
                showsUserLocation={mapConfig.showsUserLocation}
                showsMyLocationButton={mapConfig.showsMyLocationButton}
                toolbarEnabled={mapConfig.toolbarEnabled}
                onMapReady={() => setMapReady(true)}
                onError={handleMapError}
              >
                {mapReady && (
                  <Marker
                    coordinate={{
                      latitude: latitude,
                      longitude: longitude,
                    }}
                    title={t('yourLocation')}
                  />
                )}
              </MapView>
            )}
          </View>
          
          {showWorkControls && (
            <View style={styles.workControls}>
              {isWorking ? (
                <View style={styles.workStatus}>
                  <Text style={styles.workStatusText}>{t('workingSince')} {formatWorkTime()}</Text>
                  <TouchableOpacity
                    style={[styles.workButton, styles.stopButton]}
                    onPress={handleEndWork}
                    disabled={loadingAction}
                  >
                    <Text style={styles.workButtonText}>{t('endWork')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.workButton, styles.startButton]}
                  onPress={handleStartWork}
                  disabled={loadingAction}
                >
                  <Text style={styles.workButtonText}>{t('startWork')}</Text>
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
        <Text style={styles.messageText}>{t('noLocationError')}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, {marginTop: 10}]} 
          onPress={getLocation}
        >
          <Text style={styles.retryButtonText}>{t('retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, transparentContainer && styles.transparentContainer]}>
      {!transparentContainer ? (
        <View style={[styles.card, transparentContainer && styles.transparentCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t('myLocation')}</Text>
          </View>
          {content}
          {user?.isAdmin && (
            <TouchableOpacity 
              style={styles.refreshButton} 
              onPress={getLocation}
              disabled={loading}
            >
              <Text style={styles.refreshButtonText}>
                {loading ? t('updating') : t('updateLocation')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>{content}</>
      )}
      
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
  transparentContainer: {
    padding: 0,
    margin: 0,
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
  transparentCard: {
    backgroundColor: 'transparent',
    shadowColor: 'transparent',
    elevation: 0,
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
    marginBottom: 10,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
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
  workControls: {
    marginTop: 10,
  },
  workButton: {
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#2ecc71',
  },
  stopButton: {
    backgroundColor: '#e74c3c',
  },
  workButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  workStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 5,
  },
  workStatusText: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
});

export default LocationComponent;