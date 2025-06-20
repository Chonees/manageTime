import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE, Circle } from 'react-native-maps';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useLocationTracking } from '../context/LocationTrackingContext';
import * as api from '../services/api';
import { mapConfig } from '../services/platform-config';

const LocationComponent = forwardRef(({ 
  onLocationChange, 
  showWorkControls = false, 
  mapOnly = false,
  customHeight,
  transparentContainer = false,
  taskLocation = null
}, ref) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { startTracking, stopTracking } = useLocationTracking();
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [useNativeDriver, setUseNativeDriver] = useState(false);
  const [mapKey, setMapKey] = useState(1); // Clave para forzar re-renderizado del mapa
  
  // Referencia al componente de mapa
  const mapRef = useRef(null);
  
  // Exponer métodos al componente padre
  useImperativeHandle(ref, () => ({
    // Método para centrar el mapa en una ubicación específica
    centerOnLocation: (latitude, longitude) => {
      if (mapRef.current && latitude && longitude) {
        mapRef.current.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005
        }, 1000); // Duración de la animación en ms
      }
    }
  }));

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
        throw new Error('Invalid location data');
      }
      
      setLocation(currentLocation);
      
      if (onLocationChange) {
        onLocationChange(currentLocation);
      }
      
    } catch (error) {
      console.error('Error getting location:', error);
      setErrorMsg(t('locationError'));
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
        // First get a single location update
        await getLocation();
        
        if (!isMounted) return;
        
        // Then start watching for location updates
        if (Platform.OS === 'web') {
          // On web, watching position might not work as expected, so we just get position periodically
          const intervalId = setInterval(() => {
            if (isMounted) {
              getLocation();
            }
          }, 60000); // every minute
          
          return () => clearInterval(intervalId);
        } else {
          // On native, we can use the watchPosition API
          locationSubscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              distanceInterval: 10,
              timeInterval: 60000 // Update at most once per minute
            },
            (newLocation) => {
              if (isMounted) {
                setLocation(newLocation);
                if (onLocationChange) {
                  onLocationChange(newLocation);
                }
              }
            }
          );
        }
      } catch (error) {
        console.error('Error setting up location:', error);
        if (isMounted) {
          setErrorMsg(t('locationError'));
        }
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

  // Función para obtener de nuevo la ubicación
  const handleRefreshLocation = () => {
    getLocation();
  };
  
  // Handler for map ready event
  const onMapReady = () => {
    console.log('Map is ready');
    setMapReady(true);
    setMapError(false);
  };
  
  // Handler for map error event
  const onMapError = (error) => {
    console.error('Map error:', error);
    setMapError(true);
    if (Platform.OS === 'android') {
      setUseNativeDriver(true);
      // Try to reload the map with native driver
      setTimeout(() => {
        setMapKey(prev => prev + 1);
      }, 500);
    }
  };
  
  // Función para reintentar cargar el mapa
  const retryMap = () => {
    setMapError(false);
    setMapKey(prev => prev + 1);
  };

  // Renderizado condicional según el estado del componente
  if (permissionGranted === false && errorMsg) {
    return (
      <View style={[
        styles.container, 
        transparentContainer ? null : styles.containerBackground
      ]}>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity onPress={handleRefreshLocation} style={styles.refreshButton}>
          <Text style={styles.refreshButtonText}>{t('refreshLocation')}</Text>
        </TouchableOpacity>
        
        {/* Add permission explanation if needed */}
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>{t('locationPermissionExplanation')}</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[
        styles.container, 
        transparentContainer ? null : styles.containerBackground,
        { justifyContent: 'center', alignItems: 'center' }
      ]}>
        <ActivityIndicator size="large" color="#fff3e5" />
        <Text style={styles.loadingText}>{t('loadingLocation')}</Text>
      </View>
    );
  }

  if (!location || !location.coords) {
    return (
      <View style={[
        styles.container, 
        transparentContainer ? null : styles.containerBackground
      ]}>
        <Text style={styles.errorText}>{t('noLocationData')}</Text>
        <TouchableOpacity onPress={handleRefreshLocation} style={styles.refreshButton}>
          <Text style={styles.refreshButtonText}>{t('refreshLocation')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Determinar la región del mapa basado en la ubicación del usuario o la tarea seleccionada
  const mapRegion = taskLocation ? {
    latitude: taskLocation.latitude,
    longitude: taskLocation.longitude,
    latitudeDelta: 0.005, // Zoom level
    longitudeDelta: 0.005, // Zoom level
  } : {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: 0.005, // Zoom level
    longitudeDelta: 0.005, // Zoom level
  };

  // Si solo queremos mostrar el mapa, renderizamos una versión simplificada
  if (mapOnly) {
    return (
      <View style={[
        styles.mapOnlyContainer,
        customHeight ? { height: customHeight } : null
      ]}>
        {mapError ? (
          <View style={[styles.mapErrorContainer, { height: customHeight || 250 }]}>
            <Text style={styles.errorText}>{t('mapLoadError')}</Text>
            <TouchableOpacity onPress={retryMap} style={styles.refreshButton}>
              <Text style={styles.refreshButtonText}>{t('tryAgain')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            key={`map-${mapKey}`}
            style={styles.map}
            region={mapRegion}
            provider={Platform.OS === 'ios' ? undefined : PROVIDER_GOOGLE}
            onMapReady={onMapReady}
            onError={onMapError}
            showsUserLocation={true}
            showsMyLocationButton={true}
            showsCompass={true}
            rotateEnabled={true}
            scrollEnabled={true}
            zoomEnabled={true}
            pitchEnabled={true}
            toolbarEnabled={Platform.OS === 'android'}
            loadingEnabled={true}
            loadingIndicatorColor="#fff3e5"
            loadingBackgroundColor="#2e2e2e"
            animateToRegion={false}
            liteMode={useNativeDriver}
          >
            {/* Marcador de la ubicación del usuario */}
            {location && location.coords && typeof location.coords.latitude === 'number' && typeof location.coords.longitude === 'number' && (
              <Marker
                coordinate={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                }}
                title={t('yourLocation')}
                description={`${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`}
              />
            )}
            
            {/* Marcador y círculo de la tarea seleccionada */}
            {taskLocation && (
              <>
                <Marker
                  coordinate={{
                    latitude: taskLocation.latitude,
                    longitude: taskLocation.longitude,
                  }}
                  title={taskLocation.title || t('taskLocation')}
                  description={taskLocation.description || ''}
                  pinColor="#FFD700" /* Color dorado para distinguirlo */
                />
                {taskLocation.radius && (
                  <Circle
                    center={{
                      latitude: taskLocation.latitude,
                      longitude: taskLocation.longitude,
                    }}
                    radius={(taskLocation.radius || 0.1) * 1000} /* Radio en metros (convertir de km) */
                    fillColor="rgba(255, 215, 0, 0.2)"
                    strokeColor="rgba(255, 215, 0, 0.5)"
                    strokeWidth={2}
                  />
                )}
              </>
            )}
          </MapView>
        )}
      </View>
    );
  }

  return (
    <View style={[
      styles.container,
      transparentContainer ? null : styles.containerBackground
    ]}>
      {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
      
      {!mapError ? (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            key={`map-${mapKey}`}
            style={styles.map}
            region={mapRegion}
            provider={Platform.OS === 'ios' ? undefined : PROVIDER_GOOGLE}
            onMapReady={onMapReady}
            onError={onMapError}
            showsUserLocation={true}
            showsMyLocationButton={true}
            showsCompass={true}
            rotateEnabled={true}
            scrollEnabled={true}
            zoomEnabled={true}
            pitchEnabled={true}
            toolbarEnabled={Platform.OS === 'android'}
            loadingEnabled={true}
            loadingIndicatorColor="#fff3e5"
            loadingBackgroundColor="#2e2e2e"
            animateToRegion={false}
            liteMode={useNativeDriver}
          >
            {/* Marcador de la ubicación del usuario */}
            {location && location.coords && typeof location.coords.latitude === 'number' && typeof location.coords.longitude === 'number' && (
              <Marker
                coordinate={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                }}
                title={t('yourLocation')}
                description={`${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`}
              />
            )}
            
            {/* Marcador y círculo de la tarea seleccionada */}
            {taskLocation && (
              <>
                <Marker
                  coordinate={{
                    latitude: taskLocation.latitude,
                    longitude: taskLocation.longitude,
                  }}
                  title={taskLocation.title || t('taskLocation')}
                  description={taskLocation.description || ''}
                  pinColor="#FFD700" /* Color dorado para distinguirlo */
                />
                {taskLocation.radius && (
                  <Circle
                    center={{
                      latitude: taskLocation.latitude,
                      longitude: taskLocation.longitude,
                    }}
                    radius={(taskLocation.radius || 0.1) * 1000} /* Radio en metros (convertir de km) */
                    fillColor="rgba(255, 215, 0, 0.2)"
                    strokeColor="rgba(255, 215, 0, 0.5)"
                    strokeWidth={2}
                  />
                )}
              </>
            )}
          </MapView>
        </View>
      ) : (
        <View style={styles.mapErrorContainer}>
          <Text style={styles.errorText}>{t('mapLoadError')}</Text>
          <TouchableOpacity onPress={retryMap} style={styles.refreshButton}>
            <Text style={styles.refreshButtonText}>{t('tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.coordsContainer}>
        <Text style={styles.coordsText}>
          {t('locationCoordinates')}: {location && location.coords && typeof location.coords.latitude === 'number' && typeof location.coords.longitude === 'number' 
            ? `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`
            : t('unavailable')}
        </Text>
        <TouchableOpacity onPress={handleRefreshLocation} style={styles.refreshButton}>
          <Text style={styles.refreshButtonText}>{t('refreshLocation')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  containerBackground: {
    backgroundColor: '#2e2e2e',
    borderRadius: 15,
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
    marginBottom: 10,
    padding: 10,
  },
  loadingText: {
    color: '#fff3e5',
    marginTop: 10,
  },
  mapContainer: {
    height: 250,
    marginBottom: 10,
    borderRadius: 15,
    overflow: 'hidden',
  },
  mapOnlyContainer: {
    height: 250,
    width: '100%',
    overflow: 'hidden',
  },
  mapErrorContainer: {
    height: 250,
    borderRadius: 15,
    backgroundColor: '#3a3a3a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  coordsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
    flexWrap: 'wrap',
  },
  coordsText: {
    color: '#fff3e5',
    fontSize: 14,
    marginBottom: 5,
    flex: 1,
  },
  refreshButton: {
    padding: 8,
    backgroundColor: '#1c1c1c',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  refreshButtonText: {
    color: '#fff3e5',
    fontSize: 14,
    fontWeight: '500',
  },
  permissionContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
  },
  permissionText: {
    color: '#fff3e5',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default LocationComponent;
