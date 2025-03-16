import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';

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
      
      console.log('Getting current position...');
      // Get the current location with a timeout
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
        timeout: 15000, // 15 second timeout
        maximumAge: 10000, // Accept positions that are up to 10 seconds old
      });
      
      console.log('Location received:', currentLocation ? 'success' : 'null');
      
      if (!currentLocation) {
        throw new Error('Location data is null');
      }
      
      setLocation(currentLocation);
      
      // Notify parent component about location update
      if (onLocationChange) {
        onLocationChange(currentLocation);
      }
    } catch (error) {
      console.error('Location error:', error);
      setErrorMsg('No se pudo obtener la ubicación: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  // Get location when component mounts
  useEffect(() => {
    getLocation();
    
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
    
    if (showWorkControls) {
      checkWorkStatus();
    }
  }, []);

  // Función para iniciar trabajo
  const handleStartWork = async () => {
    if (!location) {
      Alert.alert('Error', 'No se puede iniciar el trabajo sin ubicación');
      return;
    }
    
    try {
      setLoadingAction(true);
      
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      
      await api.startWork(coords);
      
      setIsWorking(true);
      setWorkStartTime(new Date());
      
      Alert.alert('Éxito', 'Has iniciado tu jornada de trabajo');
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo iniciar el trabajo');
    } finally {
      setLoadingAction(false);
    }
  };

  // Función para finalizar trabajo
  const handleEndWork = async () => {
    if (!location) {
      Alert.alert('Error', 'No se puede finalizar el trabajo sin ubicación');
      return;
    }
    
    try {
      setLoadingAction(true);
      
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      
      await api.endWork(coords);
      
      setIsWorking(false);
      setWorkStartTime(null);
      
      Alert.alert('Éxito', 'Has finalizado tu jornada de trabajo');
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo finalizar el trabajo');
    } finally {
      setLoadingAction(false);
    }
  };

  // Formatear tiempo de trabajo
  const formatWorkTime = () => {
    if (!workStartTime) return '00:00:00';
    
    const now = new Date();
    const diffMs = now - workStartTime;
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
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
    
    content = (
      <View style={styles.locationInfoContainer}>
        {/* Renderizado condicional del mapa para evitar errores */}
        <View style={styles.mapContainer}>
          {Platform.OS === 'ios' ? (
            <MapView 
              style={styles.map}
              initialRegion={{
                latitude: latitude,
                longitude: longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
              onMapReady={() => setMapReady(true)}
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
          ) : (
            <View style={styles.map}>
              <Text style={styles.locationText}>
                Latitud: {latitude.toFixed(6)}, Longitud: {longitude.toFixed(6)}
              </Text>
            </View>
          )}
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

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Mi Ubicación</Text>
        </View>
        {content}
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={getLocation}
          disabled={loading}
        >
          <Text style={styles.refreshButtonText}>
            {loading ? 'Actualizando...' : 'Actualizar Ubicación'}
          </Text>
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