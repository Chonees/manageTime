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
  const [loadingAction, setLoadingAction] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [useNativeDriver, setUseNativeDriver] = useState(false);
  const [mapKey, setMapKey] = useState(1); // Clave para forzar re-renderizado del mapa

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

  // Función para obtener de nuevo la ubicación
  const handleRefreshLocation = async () => {
    await getLocation();
  };

  // Handler for map ready event
  const onMapReady = () => {
    console.log('Mapa cargado correctamente');
    setMapReady(true);
    setMapError(false);
  };

  // Handler for map error event
  const onMapError = (error) => {
    console.error('Map error:', error);
    setMapError(true);
    
    // Si hay un error con el mapa, intentamos cambiar el driver
    setUseNativeDriver(prev => !prev);
    
    // Forzar re-renderizado del mapa después de un error
    setTimeout(() => {
      setMapKey(prevKey => prevKey + 1);
    }, 500);
  };
  
  // Función para reintentar cargar el mapa
  const retryMap = () => {
    console.log('Reintentando cargar el mapa...');
    setMapError(false);
    setUseNativeDriver(prev => !prev); // Alternar entre modos
    setMapKey(prevKey => prevKey + 1); // Forzar re-renderizado
  };

  // Renderizado condicional según el estado del componente
  if (permissionGranted === false && errorMsg) {
    return (
      <View style={[
        styles.container, 
        transparentContainer ? null : styles.containerBackground
      ]}>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity onPress={getLocation} style={styles.refreshButton}>
          <Text style={styles.refreshButtonText}>{t('requestLocationPermission')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[
        styles.container, 
        transparentContainer ? null : styles.containerBackground,
        { alignItems: 'center', justifyContent: 'center' }
      ]}>
        <ActivityIndicator size="large" color="#fff3e5" />
        <Text style={styles.loadingText}>{t('gettingLocation')}</Text>
      </View>
    );
  }

  if (!location || !location.coords) {
    return (
      <View style={[
        styles.container, 
        transparentContainer ? null : styles.containerBackground
      ]}>
        <Text style={styles.errorText}>{errorMsg || t('noLocationData')}</Text>
        <TouchableOpacity onPress={handleRefreshLocation} style={styles.refreshButton}>
          <Text style={styles.refreshButtonText}>{t('refreshLocation')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Map region configuration based on user's location
  const mapRegion = {
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
};

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
});

export default LocationComponent;